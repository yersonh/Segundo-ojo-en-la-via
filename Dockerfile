FROM php:8.2-apache

# Instalar extensiones para PostgreSQL, Redis y dependencias
RUN apt-get update && apt-get install -y \
    libpq-dev \
    libpng-dev \
    libjpeg-dev \
    libzip-dev \
    libssl-dev \
    pkg-config \
    zip \
    unzip \
    curl \
    && docker-php-ext-install pdo pdo_pgsql pgsql gd zip

# Instalar Redis extension (CRÍTICO para sesiones)
RUN pecl install redis && docker-php-ext-enable redis

# Habilitar mod_rewrite
RUN a2enmod rewrite
RUN a2enmod headers

# Copiar el proyecto al contenedor
COPY . /var/www/html/

# Dar permisos correctos
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html

# Configurar Apache para usar el puerto de Railway (PRIMERO las variables)
ENV PORT=8080

# Configurar Apache ANTES de exponer el puerto
RUN sed -i "s/80/${PORT}/g" /etc/apache2/ports.conf && \
    sed -i "s/80/${PORT}/g" /etc/apache2/sites-available/000-default.conf

# Exponer el puerto (SOLO UNA VEZ)
EXPOSE 8080

CMD ["apache2-foreground"]
