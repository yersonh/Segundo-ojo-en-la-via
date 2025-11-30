<?php
class Database {
    private $host;
    private $port;
    private $dbname;
    private $user;
    private $password;
    private $conn;

    public function __construct() {
        if (!extension_loaded('pdo_pgsql')) {
            error_log("Extensión pdo_pgsql no está instalada");
            return;
        }

        $databaseUrl = getenv('DATABASE_URL');

        if ($databaseUrl) {
            $dbParts = parse_url($databaseUrl);

            $this->host = $dbParts['host'] ?? '';
            $this->port = $dbParts['port'] ?? '5432';
            $this->dbname = ltrim($dbParts['path'] ?? '', '/');
            $this->user = $dbParts['user'] ?? '';
            $this->password = $dbParts['pass'] ?? '';
        } else {

            $this->host = getenv('PGHOST') ?: 'nozomi.proxy.rlwy.net';
            $this->port = getenv('PGPORT') ?: '55963';
            $this->dbname = getenv('PGDATABASE') ?: 'railway';
            $this->user = getenv('PGUSER') ?: 'postgres';
            $this->password = getenv('PGPASSWORD') ?: 'kDPxQveFCjClOVCFFZlrAiTsEWfWWJQu';

        }
    }

    public function conectar() {
        $this->conn = null;

        try {
            $dsn = "pgsql:host={$this->host};port={$this->port};dbname={$this->dbname}";

            error_log("🔌 Intentando conectar a: {$this->host}:{$this->port}/{$this->dbname}");

            $this->conn = new PDO($dsn, $this->user, $this->password, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false
            ]);

        } catch (PDOException $e) {
        }
        return $this->conn;
    }
}
?>
