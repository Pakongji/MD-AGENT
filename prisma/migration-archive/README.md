# 미적용 제안 보관

이 폴더는 Prisma의 migration 적용 경로가 아닙니다.

`20261028010000_scope_ai_conversations.sql`은 사용자 답변 전 제안했던 계정별 대화 분리 SQL입니다. 실제 DB에 적용하지 않았으며, 기존 공용 기록 방식을 유지한다는 결정에 따라 실행 대상에서 제외해 보관합니다. 수동으로 실행하지 마세요.

실제 적용 대상은 `prisma/migrations/20261028000000_init_postgresql/migration.sql`입니다. 기존 초기 migration과 SQLite 데이터는 변경하지 않았습니다.
