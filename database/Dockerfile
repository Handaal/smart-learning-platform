# Database image with the schema baked in.
#
# The Hostinger Docker Manager deploys a pasted compose file with no repo
# checked out on the server, so schema.sql/seed.sql cannot be bind-mounted
# into /docker-entrypoint-initdb.d. They ship inside the image instead.
#
# Scripts run in filename order, once, on first boot of an empty data volume.
FROM timescale/timescaledb:latest-pg15

COPY schema.sql /docker-entrypoint-initdb.d/01_schema.sql
COPY seed.sql   /docker-entrypoint-initdb.d/02_seed.sql
