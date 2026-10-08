$ErrorActionPreference = "Stop"
$base = "http://localhost:3000"

function Invoke-Post([string]$path, [hashtable]$body) {
  return Invoke-RestMethod -Uri "$base$path" -Method Post -ContentType "application/json; charset=utf-8" -Body ($body | ConvertTo-Json -Depth 12 -Compress)
}

function Assert-True([bool]$condition, [string]$message) {
  if (-not $condition) { throw "ASSERTION FAILED: $message" }
  Write-Output "PASS: $message"
}

try {
  $initial = Invoke-RestMethod -Uri "$base/api/bootstrap"
  Assert-True ($initial.tasks.Count -ge 4) "bootstrap returns seeded tasks"
  Assert-True ($initial.inventory.Count -ge 5) "bootstrap returns seeded inventory"

  $plan = Invoke-Post "/api/ai/task-plan" @{ input = "오늘 오전 11시까지 디자인팀에 추석 프로모션 배너 시안을 넘기고, 오후 3시까지 이사님께 월 매출 보고자료를 드려야 해." }
  Assert-True ($plan.result.goals.Count -eq 2) "task planner infers two workflow goals"
  Assert-True (($plan.result.goals[0].tasks | Where-Object source -eq "AI_INFERRED").Count -ge 5) "task planner adds prerequisite and follow-up tasks"
  Assert-True (($plan.result.goals[1].tasks | Where-Object due -eq "오늘 15:00").Count -eq 1) "task planner preserves the second deadline"

  $selected = @($plan.result.goals[0].tasks[0], $plan.result.goals[0].tasks[3], $plan.result.goals[0].tasks[4])
  $afterTasks = Invoke-Post "/api/command" @{ type = "ADD_TASKS"; goal = $plan.result.goals[0].goal; goalReason = $plan.result.goals[0].reason; tasks = $selected }
  Assert-True ($afterTasks.data.tasks.Count -eq ($initial.tasks.Count + 3)) "selected planned tasks persist to SQLite"

  $trend = Invoke-Post "/api/command" @{ type = "ADD_TASK"; title = "립오일 추가 발주 검토"; category = "재고/발주"; priority = "HIGH"; due = "오늘"; reason = "시장/트렌드 분석에서 생성" }
  Assert-True (($trend.data.tasks | Where-Object title -eq "립오일 추가 발주 검토").Count -eq 1) "market action creates a task"

  $lipInventory = $trend.data.inventory | Where-Object { $_.product.name -eq "A 립밤" } | Select-Object -First 1
  $order = Invoke-Post "/api/command" @{ type = "CREATE_ORDER"; inventoryId = $lipInventory.id; quantity = 1200 }
  Assert-True (($order.data.inventory | Where-Object id -eq $lipInventory.id).orderStatus -eq "발주 완료") "purchase order changes inventory status"
  Assert-True (($order.data.tasks | Where-Object title -Like "A 립밤 1,200개 입고 추적").Count -eq 1) "purchase order creates tracking task"
  Assert-True (($order.data.calendarEvents | Where-Object title -Like "A 립밤 1,200개 입고 예정").Count -eq 1) "purchase order creates calendar event"

  $competitor = Invoke-Post "/api/command" @{ type = "ADD_TASK"; title = "B사 립 20% 할인 대응안 결정"; category = "경쟁사"; priority = "HIGH"; due = "오늘"; reason = "경쟁사 분석에서 생성" }
  Assert-True (($competitor.data.tasks | Where-Object title -eq "B사 립 20% 할인 대응안 결정").Count -ge 1) "competitor response creates a task"

  $promo = $competitor.data.promotions | Where-Object name -Like "립오일*" | Select-Object -First 1
  $advanced = Invoke-Post "/api/command" @{ type = "ADVANCE_PROMOTION"; id = $promo.id }
  Assert-True (($advanced.data.promotions | Where-Object id -eq $promo.id).stage -eq "기획") "promotion advances to planning stage"
  $scheduled = Invoke-Post "/api/command" @{ type = "SCHEDULE_PROMOTION"; id = $promo.id; startAt = "2026-11-03T00:00:00.000Z" }
  Assert-True (($scheduled.data.calendarEvents | Where-Object sourceId -eq $promo.id).Count -eq 1) "promotion connects to calendar"

  $report = Invoke-Post "/api/command" @{ type = "GENERATE_REPORT"; period = "2026년 10월" }
  Assert-True (($report.data.knowledgeDocuments | Where-Object title -Like "2026년 10월 AI 성과 리포트").Count -eq 1) "performance report persists to knowledge base"

  $answer = Invoke-Post "/api/ai/copilot" @{ question = "작년에 립 프로모션 뭐가 잘됐지?"; page = "/knowledge" }
  Assert-True ($answer.answer.sources.Count -ge 1) "knowledge answer includes evidence source"
}
finally {
  Invoke-Post "/api/command" @{ type = "RESET_DEMO" } | Out-Null
  Write-Output "PASS: demo data reset after smoke test"
}
