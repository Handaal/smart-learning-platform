-- Admin-editable platform settings (e.g. registration consent/terms text)
CREATE TABLE IF NOT EXISTS "platform_setting" (
  "key" TEXT PRIMARY KEY,
  "value" JSONB NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
