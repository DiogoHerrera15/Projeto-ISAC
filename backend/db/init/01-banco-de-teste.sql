-- Banco usado pelos testes do backend (npm test). Só roda quando o volume do Postgres é criado do zero.
-- Em um volume já existente: docker compose exec postgres psql -U isac -d isac_market -c 'create database isac_market_test'
create database isac_market_test;
