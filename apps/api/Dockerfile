FROM php:8.3-cli

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libpq-dev \
    libzip-dev \
    libicu-dev \
    unzip \
    git \
    && docker-php-ext-install \
    pdo_pgsql \
    pgsql \
    zip \
    intl \
    opcache \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# PHP configuration
RUN echo "memory_limit=256M" > /usr/local/etc/php/conf.d/memory.ini \
    && echo "upload_max_filesize=20M" >> /usr/local/etc/php/conf.d/memory.ini \
    && echo "post_max_size=25M" >> /usr/local/etc/php/conf.d/memory.ini

WORKDIR /app

# Install dependencies first (layer caching)
COPY composer.json composer.lock* ./
RUN composer install --no-dev --optimize-autoloader --no-scripts 2>/dev/null || \
    composer install --optimize-autoloader --no-scripts

# Copy application code
COPY . .

# Create required directories
RUN mkdir -p var/cache var/doctrine/proxies storage logs

EXPOSE 8080

CMD ["php", "-S", "0.0.0.0:8080", "-t", "public"]
