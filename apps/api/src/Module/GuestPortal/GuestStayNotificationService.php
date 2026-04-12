<?php
declare(strict_types=1);
namespace Lodgik\Module\GuestPortal;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\GuestStayNotification;
use Lodgik\Entity\Booking;
use Lodgik\Entity\Guest;
use Lodgik\Entity\Property;
use Lodgik\Entity\Room;
use Lodgik\Service\TermiiService;
use Lodgik\Service\ZeptoMailService;

final class GuestStayNotificationService
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly TermiiService          $termii,
        private readonly ZeptoMailService       $mail,
    ) {}

    /** List contacts for a booking (max 3) */
    public function list(string $bookingId): array
    {
        return $this->em->getRepository(GuestStayNotification::class)
            ->findBy(['bookingId' => $bookingId], ['createdAt' => 'ASC']);
    }

    /** Save a contact (create or update). Enforces max 3 per booking. */
    public function save(
        string $bookingId, string $guestId, string $tenantId, string $propertyId,
        array $data, ?string $existingId = null
    ): GuestStayNotification {
        if ($existingId) {
            $n = $this->em->find(GuestStayNotification::class, $existingId);
            if (!$n || $n->getBookingId() !== $bookingId) {
                throw new \RuntimeException('Contact not found');
            }
        } else {
            $count = count($this->list($bookingId));
            if ($count >= 3) throw new \RuntimeException('Maximum 3 emergency contacts per booking');
            $n = new GuestStayNotification($bookingId, $guestId, $tenantId, $propertyId, $data['contact_name']);
        }

        if (isset($data['contact_name']))           $n->setContactName($data['contact_name']);
        if (array_key_exists('contact_email', $data)) $n->setContactEmail($data['contact_email'] ?: null);
        if (array_key_exists('contact_phone', $data)) $n->setContactPhone($data['contact_phone'] ?: null);
        if (isset($data['notify_on_checkin']))      $n->setNotifyOnCheckin((bool) $data['notify_on_checkin']);
        if (isset($data['share_booking_details']))  $n->setShareBookingDetails((bool) $data['share_booking_details']);
        if (isset($data['share_guest_details']))    $n->setShareGuestDetails((bool) $data['share_guest_details']);

        if (!$existingId) $this->em->persist($n);
        $this->em->flush();
        return $n;
    }

    public function delete(string $id, string $bookingId): void
    {
        $n = $this->em->find(GuestStayNotification::class, $id);
        if (!$n || $n->getBookingId() !== $bookingId) throw new \RuntimeException('Contact not found');
        $this->em->remove($n);
        $this->em->flush();
    }

    /**
     * Send a stay notification to one contact.
     * Returns array of channels that succeeded.
     */
    public function send(string $id, string $bookingId): array
    {
        $n = $this->em->find(GuestStayNotification::class, $id);
        if (!$n || $n->getBookingId() !== $bookingId) throw new \RuntimeException('Contact not found');

        $booking  = $this->em->find(Booking::class, $bookingId);
        $guest    = $booking?->getGuestId()
            ? $this->em->find(\Lodgik\Entity\Guest::class, $booking->getGuestId())
            : null;
        $property = $this->em->find(Property::class, $booking?->getPropertyId());
        $room     = $booking?->getRoomId() ? $this->em->find(Room::class, $booking->getRoomId()) : null;

        $body = $this->buildMessage($n, $booking, $guest, $property, $room);
        $channels = [];

        // SMS
        if ($n->getContactPhone()) {
            if ($this->termii->send($n->getContactPhone(), $body['sms'])) {
                $channels[] = 'sms';
            }
        }

        // WhatsApp (also via Termii)
        if ($n->getContactPhone()) {
            if ($this->termii->sendWhatsApp($n->getContactPhone(), $body['whatsapp'])) {
                $channels[] = 'whatsapp';
            }
        }

        // Email
        if ($n->getContactEmail()) {
            if ($this->mail->send(
                to: $n->getContactEmail(),
                toName: $n->getContactName(),
                subject: "Stay Notification: {$guest?->getFullName()} is at {$property?->getName()}",
                htmlBody: $body['email_html'],
            )) {
                $channels[] = 'email';
            }
        }

        if (!empty($channels)) {
            $n->markSent(implode(',', $channels));
            $this->em->flush();
        }

        return $channels;
    }

    /** Auto-send all contacts with notify_on_checkin=true for a booking */
    public function sendOnCheckin(string $bookingId): void
    {
        $contacts = $this->em->getRepository(GuestStayNotification::class)
            ->findBy(['bookingId' => $bookingId, 'notifyOnCheckin' => true]);
        foreach ($contacts as $c) {
            try { $this->send($c->getId(), $bookingId); } catch (\Throwable) {}
        }
    }


    private function buildMessage(
        GuestStayNotification $n,
        ?Booking $booking,
        ?Guest $guest,
        ?Property $property,
        ?Room $room
    ): array {
        $guestName    = $guest?->getFullName() ?? 'A guest';
        $hotelName    = $property?->getName() ?? 'the hotel';
        $hotelAddress = implode(', ', array_filter([
            $property?->getAddress(),
            $property?->getCity(),
            $property?->getState(),
        ]));
        $hotelPhone   = $property?->getPhone() ?? '';
        $hotelEmail   = $property?->getEmail() ?? '';
        $roomNumber   = $room?->getRoomNumber() ?? '';
        $checkIn      = $booking?->getCheckIn()->format('D, d M Y') ?? '';
        $checkOut     = $booking?->getCheckOut()->format('D, d M Y') ?? '';
        $bookingRef   = $booking?->getBookingRef() ?? '';

        // Google Maps link from address
        $mapsQuery = urlencode($hotelAddress ?: $hotelName);
        $mapsLink  = "https://maps.google.com/?q={$mapsQuery}";

        // SMS (concise)
        $sms = "{$guestName} is staying at {$hotelName}";
        if ($n->isShareBookingDetails()) {
            $sms .= " from {$checkIn} to {$checkOut}";
            if ($roomNumber) $sms .= " (Room {$roomNumber})";
        }
        if ($hotelAddress) $sms .= ". Address: {$hotelAddress}";
        if ($hotelPhone)   $sms .= ". Tel: {$hotelPhone}";
        $sms .= " | Map: {$mapsLink}";

        // WhatsApp (more detailed)
        $wa = "🏨 *Stay Notification*\n\n";
        $wa .= "*{$guestName}* is staying at *{$hotelName}*\n";
        if ($n->isShareBookingDetails()) {
            $wa .= "📅 Check-in: {$checkIn}\n";
            $wa .= "📅 Check-out: {$checkOut}\n";
            if ($roomNumber) $wa .= "🚪 Room: {$roomNumber}\n";
            if ($bookingRef) $wa .= "🔖 Booking Ref: {$bookingRef}\n";
        }
        $wa .= "\n📍 *Hotel Details*\n";
        $wa .= "{$hotelName}\n";
        if ($hotelAddress) $wa .= "{$hotelAddress}\n";
        if ($hotelPhone)   $wa .= "📞 {$hotelPhone}\n";
        if ($hotelEmail)   $wa .= "✉️ {$hotelEmail}\n";
        $wa .= "\n🗺️ Google Maps: {$mapsLink}";

        // Email HTML
        $emailHtml = $this->buildEmailHtml(
            $n, $guestName, $hotelName, $hotelAddress, $hotelPhone,
            $hotelEmail, $roomNumber, $checkIn, $checkOut, $bookingRef, $mapsLink
        );

        return ['sms' => $sms, 'whatsapp' => $wa, 'email_html' => $emailHtml];
    }

    private function buildEmailHtml(
        GuestStayNotification $n,
        string $guestName, string $hotelName, string $hotelAddress,
        string $hotelPhone, string $hotelEmail, string $roomNumber,
        string $checkIn, string $checkOut, string $bookingRef, string $mapsLink
    ): string {
        $shareBooking = $n->isShareBookingDetails();
        $bookingSection = $shareBooking ? "
            <tr><td style='padding:8px 0;color:#6b7280;font-size:13px;'>Check-in</td><td style='padding:8px 0;font-weight:600;'>{$checkIn}</td></tr>
            <tr><td style='padding:8px 0;color:#6b7280;font-size:13px;'>Check-out</td><td style='padding:8px 0;font-weight:600;'>{$checkOut}</td></tr>
            " . ($roomNumber ? "<tr><td style='padding:8px 0;color:#6b7280;font-size:13px;'>Room</td><td style='padding:8px 0;font-weight:600;'>{$roomNumber}</td></tr>" : "")
            . ($bookingRef ? "<tr><td style='padding:8px 0;color:#6b7280;font-size:13px;'>Booking Ref</td><td style='padding:8px 0;font-weight:600;'>{$bookingRef}</td></tr>" : "")
            : '';

        // Pre-compute all conditional blocks — ternary expressions are not valid inside PHP heredocs
        $bookingTableHtml  = $bookingSection
            ? "<table style='width:100%;border-top:1px solid #f3f4f6;margin-bottom:24px;'><tbody>{$bookingSection}</tbody></table>"
            : '';
        $hotelAddressHtml  = $hotelAddress ? "<p style='color:#6b7280;font-size:14px;margin:0 0 4px;'>{$hotelAddress}</p>" : '';
        $hotelPhoneHtml    = $hotelPhone   ? "<p style='color:#6b7280;font-size:14px;margin:0 0 4px;'>📞 {$hotelPhone}</p>" : '';
        $hotelEmailHtml    = $hotelEmail   ? "<p style='color:#6b7280;font-size:14px;margin:0;'>✉️ {$hotelEmail}</p>" : '';

        return <<<HTML
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:600px;margin:24px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#1e3a1e,#2d5a2d);padding:32px 36px;">
    <p style="color:rgba(255,255,255,0.7);margin:0 0 4px;font-size:13px;text-transform:uppercase;letter-spacing:1px;">Stay Notification</p>
    <h1 style="color:white;margin:0;font-size:24px;font-weight:700;">{$hotelName}</h1>
  </div>

  <!-- Body -->
  <div style="padding:32px 36px;">
    <p style="color:#374151;font-size:15px;margin:0 0 24px;">
      Hi <strong>{$n->getContactName()}</strong>, this is a notification that
      <strong>{$guestName}</strong> is currently staying at <strong>{$hotelName}</strong>.
    </p>

    {$bookingTableHtml}

    <!-- Hotel Details -->
    <div style="background:#f9fafb;border-radius:12px;padding:20px;margin-bottom:24px;">
      <h3 style="color:#111827;font-size:14px;font-weight:700;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.5px;">📍 Hotel Location</h3>
      <p style="color:#374151;font-size:15px;font-weight:600;margin:0 0 4px;">{$hotelName}</p>
      {$hotelAddressHtml}
      {$hotelPhoneHtml}
      {$hotelEmailHtml}
    </div>

    <!-- Maps CTA -->
    <div style="text-align:center;margin-bottom:24px;">
      <a href="{$mapsLink}" style="display:inline-block;background:#466846;color:white;padding:14px 28px;border-radius:10px;font-weight:600;text-decoration:none;font-size:15px;">
        📍 View on Google Maps
      </a>
    </div>

    <p style="color:#9ca3af;font-size:12px;border-top:1px solid #f3f4f6;padding-top:16px;margin:0;">
      This notification was sent by {$guestName} via the Lodgik hotel management system.
      If you did not expect this message, please disregard it.
    </p>
  </div>
</div>
</body>
</html>
HTML;
    }
}
