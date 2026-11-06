BEGIN;

CREATE TABLE "WorkActivity" (
  "id" BIGSERIAL PRIMARY KEY,
  "entity" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "snapshot" JSONB NOT NULL
);
CREATE INDEX "WorkActivity_entity_entityId_occurredAt_idx" ON "WorkActivity" ("entity", "entityId", "occurredAt");
CREATE INDEX "WorkActivity_occurredAt_idx" ON "WorkActivity" ("occurredAt");

CREATE TABLE "PromotionPlan" (
  "id" TEXT PRIMARY KEY,
  "authorId" TEXT NOT NULL REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "promotionId" TEXT REFERENCES "Promotion"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "brief" JSONB NOT NULL,
  "research" JSONB NOT NULL,
  "draft" JSONB,
  "version" INTEGER NOT NULL DEFAULT 0,
  "revisions" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "PromotionPlan_promotionId_key" ON "PromotionPlan" ("promotionId");
CREATE INDEX "PromotionPlan_authorId_updatedAt_idx" ON "PromotionPlan" ("authorId", "updatedAt");

ALTER TABLE "WorkActivity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PromotionPlan" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "WorkActivity", "PromotionPlan" FROM anon, authenticated;
REVOKE ALL ON SEQUENCE "WorkActivity_id_seq" FROM anon, authenticated;

CREATE FUNCTION public.record_md_work_activity() RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  current_row jsonb := to_jsonb(NEW);
  previous_row jsonb := to_jsonb(OLD);
BEGIN
  IF TG_OP = 'UPDATE' AND (current_row - 'updatedAt') = (previous_row - 'updatedAt') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public."WorkActivity" ("entity", "entityId", "action", "occurredAt", "snapshot")
    VALUES (TG_TABLE_NAME, previous_row->>'id', 'DELETED', timezone('UTC', clock_timestamp()), previous_row);
    RETURN OLD;
  END IF;
  IF TG_TABLE_NAME = 'TaskDecision' AND current_row->>'status' IS DISTINCT FROM 'CONFIRMED' THEN
    RETURN NEW;
  END IF;
  INSERT INTO public."WorkActivity" ("entity", "entityId", "action", "occurredAt", "snapshot")
  VALUES (TG_TABLE_NAME, current_row->>'id', CASE WHEN TG_OP = 'INSERT' THEN 'CREATED' ELSE 'CHANGED' END,
          timezone('UTC', clock_timestamp()), current_row);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.record_md_work_activity() FROM PUBLIC, anon, authenticated;

DO $$
DECLARE
  entity text;
BEGIN
  FOREACH entity IN ARRAY ARRAY['Task','TaskDecision','CalendarEvent','CollaborationRequest','PurchaseOrder','Promotion']
  LOOP
    EXECUTE format(
      'INSERT INTO public."WorkActivity" ("entity", "entityId", "action", "occurredAt", "snapshot")
       SELECT %L, t.id, ''BASELINE'', timezone(''UTC'', now()), to_jsonb(t) FROM public.%I t %s',
      entity, entity, CASE WHEN entity = 'TaskDecision' THEN 'WHERE t.status = ''CONFIRMED''' ELSE '' END);
    EXECUTE format('CREATE TRIGGER md_work_activity AFTER INSERT OR UPDATE OR DELETE ON public.%I
      FOR EACH ROW EXECUTE FUNCTION public.record_md_work_activity()', entity);
  END LOOP;
END;
$$;

COMMIT;
