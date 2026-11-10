"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, KeyRound, Lock, Pencil, UserPlus } from "lucide-react";
import { Badge, Button, Card, DataBoundary, EmptyState, Modal, SectionTitle } from "@/components/common/ui";
import { useAppStore } from "@/lib/store/app-store";
import { hasPermission, PERMISSIONS, ROLES, roleLabel, type Permission } from "@/lib/auth/permissions";

type Account = { id: string; name: string; email: string; role: string; permissions: string[]; active: boolean; lastLoginAt: string | null; createdAt: string };
type Form = { id?: string; name: string; email: string; role: string; permissions: string[]; active: boolean };

const dateTime = (value: string | null) => value ? new Date(value).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "접속 기록 없음";

/** 관리 > 데이터 등록 > 사용자 등록: AI Agent를 쓸 사람과 역할·권한을 관리합니다. */
export function UsersPage() {
  const { data, showToast } = useAppStore();
  const viewer = data.meta.viewer;
  const canManage = hasPermission(viewer, "users");
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState<Form | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [issued, setIssued] = useState<{ name: string; email: string; password: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/users");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "사용자 목록을 불러오지 못했습니다.");
      setAccounts(payload.accounts);
      setLoadError("");
    } catch (caught) { setLoadError(caught instanceof Error ? caught.message : "사용자 목록을 불러오지 못했습니다."); }
  }, []);
  // 사용자 관리 권한이 있을 때만 목록을 불러옵니다(이메일 등 개인정보 보호).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (canManage) void load(); }, [canManage, load]);

  async function send(body: Record<string, unknown>) {
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "저장하지 못했습니다.");
      showToast(payload.message, "success");
      if (payload.temporaryPassword) setIssued({ name: payload.account.name, email: payload.account.email, password: payload.temporaryPassword });
      setForm(null);
      await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "저장하지 못했습니다."); }
    finally { setSaving(false); }
  }

  function pickRole(role: string) {
    const preset = ROLES.find((item) => item.key === role);
    setForm((current) => current ? { ...current, role, permissions: preset ? [...preset.permissions] : current.permissions } : current);
  }
  function togglePermission(key: Permission, on: boolean) {
    setForm((current) => current ? { ...current, permissions: on ? [...new Set([...current.permissions, key])] : current.permissions.filter((item) => item !== key) } : current);
  }
  const customized = form ? (() => { const preset = ROLES.find((item) => item.key === form.role); return preset ? [...preset.permissions].sort().join() !== [...form.permissions].sort().join() : false; })() : false;

  if (!canManage) return <Card><p className="md-readonly"><Lock size={13} /> 사용자 등록과 권한 설정은 ‘사용자 관리’ 권한이 있는 관리자만 할 수 있어요.</p>
    {viewer && <p className="rd-muted">내 계정: {viewer.name} · {roleLabel(viewer.role)} · 권한 {viewer.permissions.length ? viewer.permissions.map((key) => PERMISSIONS.find((item) => item.key === key)?.label ?? key).join(", ") : "조회만"}</p>}</Card>;

  return <DataBoundary><div className="stack">
    <Card>
      <SectionTitle title="사용자" description="AI Agent를 쓸 사람과 역할·권한입니다. 로그인한 사람은 모든 화면을 볼 수 있고, 저장·실행은 켜 둔 권한만 할 수 있어요. 직접 회원가입한 사람은 ‘조회 전용’으로 시작합니다." action={<Button onClick={() => { setError(""); setForm({ name: "", email: "", role: "MD", permissions: [...(ROLES.find((item) => item.key === "MD")?.permissions ?? [])], active: true }); }}><UserPlus size={13} /> 사용자 등록</Button>} />
      {loadError && <p className="decision-error" role="alert">{loadError}</p>}
      {!accounts && !loadError && <p className="rd-muted">사용자 목록을 불러오는 중…</p>}
      {accounts && (accounts.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>이름</th><th>이메일</th><th>역할</th><th>권한</th><th>상태</th><th>마지막 접속</th><th /></tr></thead><tbody>
        {accounts.map((account) => <tr key={account.id} className={account.active ? "" : "md-inactive"}><td><strong>{account.name}</strong>{account.id === viewer?.id && <Badge tone="purple">나</Badge>}</td><td>{account.email}</td><td>{roleLabel(account.role)}</td>
          <td><div className="md-perm-chips">{account.permissions.length ? account.permissions.map((key) => <Badge key={key}>{PERMISSIONS.find((item) => item.key === key)?.label ?? key}</Badge>) : <span className="rd-muted">조회만</span>}</div></td>
          <td>{account.active ? <Badge tone="green">사용 중</Badge> : <Badge tone="neutral">사용 중지</Badge>}</td><td className="tiny">{dateTime(account.lastLoginAt)}</td>
          <td className="md-row-actions"><button className="icon-button" onClick={() => { setError(""); setForm({ id: account.id, name: account.name, email: account.email, role: account.role, permissions: account.permissions, active: account.active }); }} aria-label={`${account.name} 권한 수정`}><Pencil size={14} /></button><button className="icon-button" disabled={saving} onClick={() => void send({ action: "reset-password", id: account.id })} aria-label={`${account.name} 비밀번호 재설정`} title="임시 비밀번호 재발급"><KeyRound size={14} /></button></td></tr>)}
      </tbody></table></div> : <EmptyState title="등록된 사용자가 없어요" description="사용자 등록으로 추가하세요." />)}
    </Card>

    <Card>
      <SectionTitle title="역할별 기본 권한" description="역할을 고르면 아래 권한이 켜지고, 사람마다 개별로 더하거나 뺄 수 있어요." />
      <div className="table-wrap"><table className="data-table md-role-table"><thead><tr><th>권한</th>{ROLES.map((role) => <th key={role.key}>{role.label}</th>)}</tr></thead><tbody>
        {PERMISSIONS.map((permission) => <tr key={permission.key}><td><strong>{permission.label}</strong><div className="tiny">{permission.description}</div></td>{ROLES.map((role) => <td key={role.key}>{(role.permissions as readonly string[]).includes(permission.key) ? "●" : "—"}</td>)}</tr>)}
      </tbody></table></div>
    </Card>

    <Modal open={Boolean(form)} title={form?.id ? "사용자 권한 수정" : "사용자 등록"} onClose={() => setForm(null)} width="600px">{form && <>
      <div className="form-grid">
        <div className="field"><label htmlFor="usr-name">이름 *</label><input id="usr-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></div>
        <div className="field"><label htmlFor="usr-email">이메일 (로그인 아이디) *</label><input id="usr-email" type="email" value={form.email} disabled={Boolean(form.id)} onChange={(event) => setForm({ ...form, email: event.target.value })} /></div>
      </div>
      <fieldset className="md-role-pick"><legend>역할</legend>
        {ROLES.map((role) => <label key={role.key} className={form.role === role.key ? "selected" : ""}><input type="radio" name="usr-role" checked={form.role === role.key} onChange={() => pickRole(role.key)} /><span><strong>{role.label}</strong><small>{role.description}</small></span></label>)}
      </fieldset>
      <fieldset className="md-brand-pick"><legend>권한 {customized && <Badge tone="orange">역할 기본값에서 바꿈</Badge>}</legend>
        {PERMISSIONS.map((permission) => <label key={permission.key} title={permission.description}><input type="checkbox" checked={form.permissions.includes(permission.key)} disabled={form.id === viewer?.id && permission.key === "users"} onChange={(event) => togglePermission(permission.key, event.target.checked)} /> {permission.label}</label>)}
      </fieldset>
      {form.id && <label className="md-check"><input type="checkbox" checked={!form.active} disabled={form.id === viewer?.id} onChange={(event) => setForm({ ...form, active: !event.target.checked })} /> 사용 중지 (로그인할 수 없게 함)</label>}
      {!form.id && <p className="pd-data-note">저장하면 임시 비밀번호가 한 번 표시됩니다. 등록한 사람에게 직접 전달해주세요.</p>}
      {error && <p className="decision-error" role="alert">{error}</p>}
      <div className="modal-actions"><Button variant="secondary" onClick={() => setForm(null)}>취소</Button><Button disabled={saving || form.name.trim().length < 2 || !/^\S+@\S+\.\S+$/.test(form.email)} onClick={() => void send(form.id ? { action: "update", id: form.id, name: form.name, role: form.role, permissions: form.permissions, active: form.active } : { action: "create", name: form.name, email: form.email, role: form.role, permissions: form.permissions })}>{form.id ? "저장" : "등록하고 임시 비밀번호 받기"}</Button></div>
    </>}</Modal>

    <Modal open={Boolean(issued)} title="임시 비밀번호" onClose={() => setIssued(null)} width="460px">{issued && <>
      <p>{issued.name}님({issued.email})의 임시 비밀번호입니다. <strong>이 창을 닫으면 다시 볼 수 없어요.</strong></p>
      <div className="md-password">{issued.password}</div>
      <div className="modal-actions"><Button variant="secondary" onClick={async () => { try { await navigator.clipboard.writeText(`MD AI Agent 로그인\n아이디: ${issued.email}\n임시 비밀번호: ${issued.password}`); showToast("로그인 정보를 복사했어요.", "success"); } catch { showToast("복사하지 못했어요. 직접 옮겨 적어주세요.", "error"); } }}><Copy size={13} /> 로그인 정보 복사</Button><Button onClick={() => setIssued(null)}>확인</Button></div>
    </>}</Modal>
  </div></DataBoundary>;
}
