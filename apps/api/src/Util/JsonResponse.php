<?php
declare(strict_types=1);
namespace Lodgik\Util;

/**
 * Alias for \Lodgik\Helper\JsonResponse.
 * Some controllers import from Util, others from Helper.
 */
class JsonResponse extends \Lodgik\Helper\JsonResponse {}
