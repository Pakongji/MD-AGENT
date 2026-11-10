"use client";

import { useMemo, useRef, useState } from "react";
import { Building2, ImagePlus, Link2, Lock, PackagePlus, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Card, DataBoundary, EmptyState, Modal, SectionTitle, money } from "@/components/common/ui";
import { useAppStore } from "@/lib/store/app-store";
import { supplierFor } from "@/lib/orders/purchase-order";
import { hasPermission } from "@/lib/auth/permissions";
import { ProductLabel, ProductThumb } from "@/components/common/product-thumb";
import { imageFileToThumbnail, isAllowedImageValue } from "@/lib/utils/image";
import type { ProductItem, SupplierItem, SupplierProductItem } from "@/lib/types/domain";

type SupplierForm = { id?: string; name: string; contactName: string; email: string; cc: string; phone: string; deliverTo: string; paymentTerms: string; leadTimeDays: string; memo: string; brandIds: string[] };
type ProductForm = { id?: string; name: string; imageUrl: string; sku: string; category: string; brandName: string; supplierId: string; price: string; cost: string; withStock: boolean; stockQty: string; dailySales: string; leadTimeDays: string; safetyStock: string };
type SupplierProductForm = { id?: string; supplierId: string; name: string; supplierSku: string; category: string; unitCost: string; moq: string; leadTimeDays: string; memo: string; linkedProductId: string };

const emptySupplier: SupplierForm = { name: "", contactName: "", email: "", cc: "", phone: "", deliverTo: "자사 이천 물류센터", paymentTerms: "", leadTimeDays: "", memo: "", brandIds: [] };
const emptyProduct: ProductForm = { name: "", imageUrl: "", sku: "", category: "", brandName: "", supplierId: "", price: "", cost: "", withStock: false, stockQty: "", dailySales: "", leadTimeDays: "", safetyStock: "" };
const emptySupplierProduct: SupplierProductForm = { supplierId: "", name: "", supplierSku: "", category: "", unitCost: "", moq: "", leadTimeDays: "", memo: "", linkedProductId: "" };
const num = (value: string) => (value.trim() === "" ? null : Number(value));
const validEmail = (value: string) => !value.trim() || /^\S+@\S+\.\S+$/.test(value.trim());

/** 관리 > 데이터 등록: 거래처(공급사)와 상품(자사·공급사)을 등록·수정합니다. */
export function MasterDataPage({ section }: { section: "suppliers" | "products" }) {
  const { data, command, busy } = useAppStore();
  const canEdit = hasPermission(data.meta.viewer, "master");
  const [productKind, setProductKind] = useState<"own" | "supplier">("own");
  const [supplierForm, setSupplierForm] = useState<SupplierForm | null>(null);
  const [productForm, setProductForm] = useState<ProductForm | null>(null);
  const [spForm, setSpForm] = useState<SupplierProductForm | null>(null);
  const [deleting, setDeleting] = useState<{ kind: "supplier"; item: SupplierItem } | { kind: "supplierProduct"; item: SupplierProductItem } | null>(null);
  const [error, setError] = useState("");
  const [imageBusy, setImageBusy] = useState(false);
  const [imageUrlDraft, setImageUrlDraft] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  async function pickImage(file?: File | null) {
    if (!file) return;
    setImageBusy(true); setError("");
    try { const thumb = await imageFileToThumbnail(file); setProductForm((form) => (form ? { ...form, imageUrl: thumb } : form)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "이미지를 넣지 못했어요."); }
    finally { setImageBusy(false); if (fileInput.current) fileInput.current.value = ""; }
  }
  function applyImageUrl() {
    const value = imageUrlDraft.trim();
    if (!/^https:\/\//.test(value) || !isAllowedImageValue(value)) return setError("https://로 시작하는 이미지 주소를 넣어주세요.");
    setProductForm((form) => (form ? { ...form, imageUrl: value } : form)); setImageUrlDraft(""); setError("");
  }

  const brands = useMemo(() => {
    const map = new Map<string, { id: string; name: string; supplierId?: string | null }>();
    for (const product of data.products) if (product.brandId) map.set(product.brandId, { id: product.brandId, name: product.brand.name, supplierId: product.brand.supplierId });
    for (const supplier of data.suppliers) for (const brand of supplier.brands) if (!map.has(brand.id)) map.set(brand.id, { ...brand, supplierId: supplier.id });
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "ko"));
  }, [data.products, data.suppliers]);
  const categories = [...new Set(data.products.map((product) => product.category))];
  const supplierName = (id?: string | null) => data.suppliers.find((supplier) => supplier.id === id)?.name;
  const productName = (id?: string | null) => data.products.find((product) => product.id === id)?.name;
  const unlinked = brands.filter((brand) => !brand.supplierId);

  function editSupplier(supplier?: SupplierItem, sampleBrand?: { id: string; name: string }) {
    setError("");
    if (supplier) return setSupplierForm({ id: supplier.id, name: supplier.name, contactName: supplier.contactName, email: supplier.email, cc: supplier.cc, phone: supplier.phone, deliverTo: supplier.deliverTo, paymentTerms: supplier.paymentTerms, leadTimeDays: supplier.leadTimeDays?.toString() ?? "", memo: supplier.memo, brandIds: supplier.brands.map((brand) => brand.id) });
    const sample = sampleBrand ? supplierFor(sampleBrand.name) : undefined;
    setSupplierForm(sample && sampleBrand
      ? { ...emptySupplier, name: sample.company, contactName: sample.contactName, deliverTo: sample.deliverTo, paymentTerms: sample.paymentTerms, brandIds: [sampleBrand.id] }
      : { ...emptySupplier, brandIds: sampleBrand ? [sampleBrand.id] : [] });
  }

  function editProduct(product?: ProductItem) {
    setError("");
    if (!product) return setProductForm({ ...emptyProduct });
    const inventory = data.inventory.find((item) => item.productId === product.id);
    setProductForm({
      id: product.id, name: product.name, imageUrl: product.imageUrl ?? "", sku: product.sku ?? "", category: product.category, brandName: product.brand.name, supplierId: product.brand.supplierId ?? "",
      price: product.price?.toString() ?? "", cost: product.cost?.toString() ?? "", withStock: Boolean(inventory),
      stockQty: inventory?.stockQty.toString() ?? "", dailySales: inventory?.dailySales.toString() ?? "", leadTimeDays: inventory?.leadTimeDays.toString() ?? "", safetyStock: inventory?.safetyStock.toString() ?? "",
    });
  }

  function editSupplierProduct(item?: SupplierProductItem) {
    setError("");
    setSpForm(item
      ? { id: item.id, supplierId: item.supplierId, name: item.name, supplierSku: item.supplierSku, category: item.category, unitCost: item.unitCost?.toString() ?? "", moq: item.moq?.toString() ?? "", leadTimeDays: item.leadTimeDays?.toString() ?? "", memo: item.memo, linkedProductId: item.linkedProductId ?? "" }
      : { ...emptySupplierProduct, supplierId: data.suppliers[0]?.id ?? "", leadTimeDays: data.suppliers[0]?.leadTimeDays?.toString() ?? "" });
  }

  async function saveSupplier() {
    if (!supplierForm) return;
    if (!supplierForm.name.trim()) return setError("거래처명을 입력해주세요.");
    if (!supplierForm.email.trim()) return setError("발주서를 받을 이메일을 입력해주세요.");
    if (!validEmail(supplierForm.email)) return setError("이메일 형식을 확인해주세요.");
    if (await command({ type: "SAVE_SUPPLIER", ...supplierForm, leadTimeDays: num(supplierForm.leadTimeDays) })) setSupplierForm(null);
  }

  async function saveProduct() {
    if (!productForm) return;
    if (!productForm.name.trim() || !productForm.category.trim() || !productForm.brandName.trim()) return setError("상품명·카테고리·브랜드는 꼭 입력해주세요.");
    const stockValues = [productForm.stockQty, productForm.dailySales, productForm.leadTimeDays, productForm.safetyStock];
    if (productForm.withStock && stockValues.some((value) => value.trim() === "" || Number(value) < 0)) return setError("재고를 함께 등록하려면 현재고·일평균 판매·리드타임·안전재고를 모두 입력해주세요.");
    const ok = await command({
      type: "SAVE_PRODUCT", id: productForm.id, name: productForm.name, category: productForm.category, brandName: productForm.brandName, supplierId: productForm.supplierId,
      sku: productForm.sku, imageUrl: productForm.imageUrl, price: num(productForm.price), cost: num(productForm.cost),
      ...(productForm.withStock ? { stock: { stockQty: Number(productForm.stockQty), dailySales: Number(productForm.dailySales), leadTimeDays: Number(productForm.leadTimeDays), safetyStock: Number(productForm.safetyStock) } } : {}),
    });
    if (ok) setProductForm(null);
  }

  async function saveSupplierProduct() {
    if (!spForm) return;
    if (!spForm.supplierId) return setError("거래처를 먼저 등록하고 선택해주세요.");
    if (!spForm.name.trim()) return setError("품목명을 입력해주세요.");
    const ok = await command({ type: "SAVE_SUPPLIER_PRODUCT", ...spForm, unitCost: num(spForm.unitCost), moq: num(spForm.moq), leadTimeDays: num(spForm.leadTimeDays) });
    if (ok) setSpForm(null);
  }

  const margin = productForm && Number(productForm.price) > 0 && productForm.cost !== "" ? ((Number(productForm.price) - Number(productForm.cost)) / Number(productForm.price) * 100) : null;
  const sp = (key: keyof SupplierForm, value: string) => setSupplierForm((form) => (form ? { ...form, [key]: value } : form));
  const pp = (key: keyof ProductForm, value: string | boolean) => setProductForm((form) => (form ? { ...form, [key]: value } : form));
  const sf = (key: keyof SupplierProductForm, value: string) => setSpForm((form) => (form ? { ...form, [key]: value } : form));
  const readOnlyNote = !canEdit && <p className="md-readonly"><Lock size={13} /> 보기만 가능해요. 등록·수정하려면 관리자에게 ‘데이터 등록’ 권한을 요청하세요.</p>;

  return <DataBoundary><div className="stack">
    {readOnlyNote}

    {section === "suppliers" && <Card>
      <SectionTitle title="거래처 (공급사)" description="발주서를 받을 거래처와 담당자입니다. 브랜드를 연결하면 그 브랜드 상품의 발주서에 자동으로 들어갑니다." action={<Button disabled={!canEdit} onClick={() => editSupplier()}><Plus size={13} /> 거래처 등록</Button>} />
      {unlinked.length > 0 && <div className="md-unlinked"><strong>거래처가 연결되지 않은 브랜드 {unlinked.length}개</strong><span className="rd-muted">지금은 발주서에 샘플 연락처가 들어가요. 실제 거래처를 등록하세요.</span>
        <div className="md-chip-row">{unlinked.map((brand) => <button key={brand.id} className="md-chip" disabled={!canEdit} onClick={() => editSupplier(undefined, brand)}><Building2 size={12} /> {brand.name} 거래처 등록</button>)}</div></div>}
      {data.suppliers.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>거래처</th><th>담당자</th><th>발주 이메일</th><th>연결 브랜드</th><th>공급 품목</th><th>리드타임</th><th>결제 조건</th><th /></tr></thead><tbody>
        {data.suppliers.map((supplier) => <tr key={supplier.id}><td><strong>{supplier.name}</strong>{supplier.phone && <div className="tiny">{supplier.phone}</div>}</td><td>{supplier.contactName || "—"}</td><td>{supplier.email || <span className="red">미입력</span>}{supplier.cc && <div className="tiny">참조 {supplier.cc}</div>}</td><td>{supplier.brands.length ? supplier.brands.map((brand) => <Badge key={brand.id}>{brand.name}</Badge>) : <span className="rd-muted">없음</span>}</td><td>{data.supplierProducts.filter((item) => item.supplierId === supplier.id).length}개</td><td>{supplier.leadTimeDays != null ? `${supplier.leadTimeDays}일` : "—"}</td><td>{supplier.paymentTerms || "—"}</td>
          <td className="md-row-actions"><button className="icon-button" disabled={!canEdit} onClick={() => editSupplier(supplier)} aria-label={`${supplier.name} 수정`}><Pencil size={14} /></button><button className="icon-button" disabled={!canEdit} onClick={() => setDeleting({ kind: "supplier", item: supplier })} aria-label={`${supplier.name} 삭제`}><Trash2 size={14} /></button></td></tr>)}
      </tbody></table></div> : <EmptyState title="등록된 거래처가 없어요" description="위의 브랜드 버튼을 누르면 샘플 정보를 채운 상태로 시작할 수 있어요. 이메일은 실제 주소로 넣어주세요." />}
    </Card>}

    {section === "products" && <>
      <div className="rd-segment" role="group" aria-label="상품 종류">
        <button aria-pressed={productKind === "own"} onClick={() => setProductKind("own")}>자사 상품 {data.products.length}</button>
        <button aria-pressed={productKind === "supplier"} onClick={() => setProductKind("supplier")}>공급사 상품 {data.supplierProducts.length}</button>
      </div>

      {productKind === "own" && <Card>
        <SectionTitle title="자사 상품" description="우리가 판매하는 상품입니다. 재고를 함께 넣으면 재고·발주 화면과 홈 알림에 바로 반영됩니다." action={<Button disabled={!canEdit} onClick={() => editProduct()}><PackagePlus size={13} /> 자사 상품 등록</Button>} />
        <div className="table-wrap"><table className="data-table"><thead><tr><th>상품</th><th>품번</th><th>브랜드 · 거래처</th><th>판매가</th><th>원가</th><th>마진율</th><th>공급사 품목</th><th>재고</th><th /></tr></thead><tbody>
          {data.products.map((product) => { const inventory = data.inventory.find((item) => item.productId === product.id); const linked = data.supplierProducts.filter((item) => item.linkedProductId === product.id); return <tr key={product.id}><td><ProductLabel name={product.name} src={product.imageUrl ?? null} sub={`${product.category} · ${product.lifecycle}`} /></td><td>{product.sku || "—"}</td><td>{product.brand.name}<div className="tiny">{supplierName(product.brand.supplierId) ?? <span className="rd-muted">거래처 미연결</span>}</div></td><td>{product.price != null ? `${money(product.price)}원` : "—"}</td><td>{product.cost != null ? `${money(product.cost)}원` : "—"}</td><td>{product.marginRate}%</td><td>{linked.length ? linked.map((item) => <div key={item.id} className="tiny"><Link2 size={11} /> {item.name}{item.unitCost != null ? ` · ${money(item.unitCost)}원` : ""}</div>) : <span className="rd-muted">—</span>}</td><td>{inventory ? `${money(inventory.stockQty)}개 · ${inventory.stockDays}일분` : <span className="rd-muted">미등록</span>}</td><td><button className="icon-button" disabled={!canEdit} onClick={() => editProduct(product)} aria-label={`${product.name} 수정`}><Pencil size={14} /></button></td></tr>; })}
        </tbody></table></div>
      </Card>}

      {productKind === "supplier" && <Card>
        <SectionTitle title="공급사 상품" description="거래처가 공급하는 품목과 공급가·MOQ입니다. 자사 상품과 연결하면 그 상품의 발주서에 공급가와 금액이 들어갑니다. 아직 팔지 않는 소싱 후보도 등록할 수 있어요." action={<Button disabled={!canEdit || !data.suppliers.length} onClick={() => editSupplierProduct()}><PackagePlus size={13} /> 공급사 상품 등록</Button>} />
        {!data.suppliers.length && <p className="pd-data-note">먼저 ‘거래처 등록’ 탭에서 거래처를 등록하세요.</p>}
        {data.supplierProducts.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>거래처</th><th>품목</th><th>공급사 품번</th><th>공급가</th><th>MOQ</th><th>리드타임</th><th>연결된 자사 상품</th><th /></tr></thead><tbody>
          {data.supplierProducts.map((item) => <tr key={item.id}><td>{supplierName(item.supplierId) ?? "—"}</td><td><strong>{item.name}</strong>{item.category && <div className="tiny">{item.category}</div>}</td><td>{item.supplierSku || "—"}</td><td>{item.unitCost != null ? `${money(item.unitCost)}원` : "—"}</td><td>{item.moq != null ? `${money(item.moq)}개` : "—"}</td><td>{item.leadTimeDays != null ? `${item.leadTimeDays}일` : "—"}</td><td>{productName(item.linkedProductId) ? <ProductLabel name={productName(item.linkedProductId)!} productId={item.linkedProductId} size={24} /> : <Badge tone="purple">소싱 후보</Badge>}</td>
            <td className="md-row-actions"><button className="icon-button" disabled={!canEdit} onClick={() => editSupplierProduct(item)} aria-label={`${item.name} 수정`}><Pencil size={14} /></button><button className="icon-button" disabled={!canEdit} onClick={() => setDeleting({ kind: "supplierProduct", item })} aria-label={`${item.name} 삭제`}><Trash2 size={14} /></button></td></tr>)}
        </tbody></table></div> : <EmptyState title="등록된 공급사 상품이 없어요" description="거래처가 보낸 견적서·품목표의 품목과 공급가를 등록하세요." />}
      </Card>}
    </>}

    <Modal open={Boolean(supplierForm)} title={supplierForm?.id ? "거래처 수정" : "거래처 등록"} onClose={() => setSupplierForm(null)} width="640px">{supplierForm && <>
      <div className="form-grid">
        <div className="field"><label htmlFor="sup-name">거래처명 *</label><input id="sup-name" value={supplierForm.name} onChange={(event) => sp("name", event.target.value)} placeholder="예: A뷰티(주)" /></div>
        <div className="field"><label htmlFor="sup-contact">담당자</label><input id="sup-contact" value={supplierForm.contactName} onChange={(event) => sp("contactName", event.target.value)} placeholder="예: 영업팀 김지은 매니저" /></div>
        <div className="field"><label htmlFor="sup-email">발주 이메일 *</label><input id="sup-email" type="email" value={supplierForm.email} onChange={(event) => sp("email", event.target.value)} placeholder="order@거래처.co.kr" /></div>
        <div className="field"><label htmlFor="sup-cc">참조(CC)</label><input id="sup-cc" value={supplierForm.cc} onChange={(event) => sp("cc", event.target.value)} placeholder="쉼표로 여러 명" /></div>
        <div className="field"><label htmlFor="sup-phone">연락처</label><input id="sup-phone" value={supplierForm.phone} onChange={(event) => sp("phone", event.target.value)} /></div>
        <div className="field"><label htmlFor="sup-lead">기본 리드타임(일)</label><input id="sup-lead" type="number" min={0} value={supplierForm.leadTimeDays} onChange={(event) => sp("leadTimeDays", event.target.value)} /></div>
        <div className="field"><label htmlFor="sup-deliver">납품처</label><input id="sup-deliver" value={supplierForm.deliverTo} onChange={(event) => sp("deliverTo", event.target.value)} /></div>
        <div className="field"><label htmlFor="sup-terms">결제 조건</label><input id="sup-terms" value={supplierForm.paymentTerms} onChange={(event) => sp("paymentTerms", event.target.value)} placeholder="예: 월말 마감 익월 말 현금" /></div>
      </div>
      <div className="field" style={{ marginTop: 10 }}><label htmlFor="sup-memo">메모</label><input id="sup-memo" value={supplierForm.memo} onChange={(event) => sp("memo", event.target.value)} placeholder="MOQ, 휴무일, 긴급 납기 가능 여부 등" /></div>
      {/* 브랜드 연결은 '○○ 거래처 등록' 버튼(해당 브랜드 자동 연결)과 상품 등록의 거래처 선택에서 합니다. 수정할 때는 기존 연결을 그대로 둡니다. */}
      {!supplierForm.id && supplierForm.brandIds.length > 0 && <p className="pd-data-note">저장하면 {brands.filter((brand) => supplierForm.brandIds.includes(brand.id)).map((brand) => brand.name).join(", ")} 상품의 발주서에 이 거래처가 자동으로 들어갑니다.</p>}
      {error && <p className="decision-error" role="alert">{error}</p>}
      <div className="modal-actions"><Button variant="secondary" onClick={() => setSupplierForm(null)}>취소</Button><Button disabled={busy} onClick={() => void saveSupplier()}>저장</Button></div>
    </>}</Modal>

    <Modal open={Boolean(productForm)} title={productForm?.id ? "자사 상품 수정" : "자사 상품 등록"} onClose={() => setProductForm(null)} width="640px">{productForm && <>
      <div className="md-image-field">
        <button type="button" className={`md-image-drop${imageBusy ? " is-busy" : ""}`} onClick={() => fileInput.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void pickImage(event.dataTransfer.files?.[0]); }} aria-label="상품 이미지 선택">
          {productForm.imageUrl ? <ProductThumb name={productForm.name || "상품"} src={productForm.imageUrl} size={112} /> : <span><ImagePlus size={22} /><small>{imageBusy ? "줄이는 중…" : "클릭하거나 끌어다 놓기"}</small></span>}
        </button>
        <div className="md-image-side">
          <strong>상품 이미지 (썸네일)</strong>
          <span className="rd-muted">정사각형으로 잘라 작게 줄여 저장해요. 모든 상품 목록에서 상품명 옆에 보입니다.</span>
          <div className="md-image-actions">
            <Button variant="secondary" disabled={imageBusy} onClick={() => fileInput.current?.click()}><ImagePlus size={13} /> 이미지 선택</Button>
            {productForm.imageUrl && <Button variant="ghost" onClick={() => pp("imageUrl", "")}><Trash2 size={13} /> 삭제</Button>}
          </div>
          <div className="md-image-url"><input value={imageUrlDraft} onChange={(event) => setImageUrlDraft(event.target.value)} placeholder="또는 이미지 주소(https://…) 붙여넣기" aria-label="이미지 주소" /><Button variant="ghost" disabled={!imageUrlDraft.trim()} onClick={applyImageUrl}>넣기</Button></div>
        </div>
        <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(event) => void pickImage(event.target.files?.[0])} />
      </div>
      <div className="form-grid">
        <div className="field"><label htmlFor="prd-name">상품명 *</label><input id="prd-name" value={productForm.name} onChange={(event) => pp("name", event.target.value)} placeholder="예: A 립밤 미니" /></div>
        <div className="field"><label htmlFor="prd-sku">품번(SKU)</label><input id="prd-sku" value={productForm.sku} onChange={(event) => pp("sku", event.target.value)} placeholder="예: AB-LB-001" /></div>
        <div className="field"><label htmlFor="prd-category">카테고리 *</label><input id="prd-category" list="prd-categories" value={productForm.category} onChange={(event) => pp("category", event.target.value)} /><datalist id="prd-categories">{categories.map((item) => <option key={item} value={item} />)}</datalist></div>
        <div className="field"><label htmlFor="prd-brand">브랜드 *</label><input id="prd-brand" list="prd-brands" value={productForm.brandName} onChange={(event) => { const name = event.target.value; const known = brands.find((brand) => brand.name === name); setProductForm((form) => form ? { ...form, brandName: name, supplierId: known?.supplierId ?? form.supplierId } : form); }} placeholder="기존 브랜드 선택 또는 새로 입력" /><datalist id="prd-brands">{brands.map((brand) => <option key={brand.id} value={brand.name} />)}</datalist></div>
        <div className="field"><label htmlFor="prd-supplier">거래처 (브랜드에 연결)</label><select id="prd-supplier" value={productForm.supplierId} onChange={(event) => { const supplier = data.suppliers.find((item) => item.id === event.target.value); setProductForm((form) => form ? { ...form, supplierId: event.target.value, leadTimeDays: form.leadTimeDays || supplier?.leadTimeDays?.toString() || "" } : form); }}><option value="">선택 안 함</option>{data.suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></div>
        <div className="field"><label>마진율</label><input readOnly value={margin === null ? "판매가·원가를 넣으면 계산" : `${margin.toFixed(1)}%`} /></div>
        <div className="field"><label htmlFor="prd-price">판매가(원)</label><input id="prd-price" type="number" min={0} value={productForm.price} onChange={(event) => pp("price", event.target.value)} /></div>
        <div className="field"><label htmlFor="prd-cost">원가(원)</label><input id="prd-cost" type="number" min={0} value={productForm.cost} onChange={(event) => pp("cost", event.target.value)} /></div>
      </div>
      <label className="md-check"><input type="checkbox" checked={productForm.withStock} onChange={(event) => pp("withStock", event.target.checked)} /> 재고도 함께 등록 (재고·발주 화면과 품절 알림에 반영)</label>
      {productForm.withStock && <div className="form-grid">
        <div className="field"><label htmlFor="prd-stock">현재고(개)</label><input id="prd-stock" type="number" min={0} value={productForm.stockQty} onChange={(event) => pp("stockQty", event.target.value)} /></div>
        <div className="field"><label htmlFor="prd-daily">일평균 판매(개)</label><input id="prd-daily" type="number" min={0} value={productForm.dailySales} onChange={(event) => pp("dailySales", event.target.value)} /></div>
        <div className="field"><label htmlFor="prd-lead">리드타임(일)</label><input id="prd-lead" type="number" min={0} value={productForm.leadTimeDays} onChange={(event) => pp("leadTimeDays", event.target.value)} /></div>
        <div className="field"><label htmlFor="prd-safety">안전재고(개)</label><input id="prd-safety" type="number" min={0} value={productForm.safetyStock} onChange={(event) => pp("safetyStock", event.target.value)} /></div>
      </div>}
      {error && <p className="decision-error" role="alert">{error}</p>}
      <div className="modal-actions"><Button variant="secondary" onClick={() => setProductForm(null)}>취소</Button><Button disabled={busy} onClick={() => void saveProduct()}>저장</Button></div>
    </>}</Modal>

    <Modal open={Boolean(spForm)} title={spForm?.id ? "공급사 상품 수정" : "공급사 상품 등록"} onClose={() => setSpForm(null)} width="640px">{spForm && <>
      <div className="form-grid">
        <div className="field"><label htmlFor="sp-supplier">거래처 *</label><select id="sp-supplier" value={spForm.supplierId} onChange={(event) => { const supplier = data.suppliers.find((item) => item.id === event.target.value); setSpForm((form) => form ? { ...form, supplierId: event.target.value, leadTimeDays: form.leadTimeDays || supplier?.leadTimeDays?.toString() || "" } : form); }}>{data.suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></div>
        <div className="field"><label htmlFor="sp-name">품목명 *</label><input id="sp-name" value={spForm.name} onChange={(event) => sf("name", event.target.value)} placeholder="거래처 견적서상의 품목명" /></div>
        <div className="field"><label htmlFor="sp-sku">공급사 품번</label><input id="sp-sku" value={spForm.supplierSku} onChange={(event) => sf("supplierSku", event.target.value)} /></div>
        <div className="field"><label htmlFor="sp-category">카테고리</label><input id="sp-category" list="prd-categories" value={spForm.category} onChange={(event) => sf("category", event.target.value)} /><datalist id="prd-categories">{categories.map((item) => <option key={item} value={item} />)}</datalist></div>
        <div className="field"><label htmlFor="sp-cost">공급가(원, 개당)</label><input id="sp-cost" type="number" min={0} value={spForm.unitCost} onChange={(event) => sf("unitCost", event.target.value)} /></div>
        <div className="field"><label htmlFor="sp-moq">MOQ(최소 주문 수량)</label><input id="sp-moq" type="number" min={0} value={spForm.moq} onChange={(event) => sf("moq", event.target.value)} /></div>
        <div className="field"><label htmlFor="sp-lead">리드타임(일)</label><input id="sp-lead" type="number" min={0} value={spForm.leadTimeDays} onChange={(event) => sf("leadTimeDays", event.target.value)} /></div>
        <div className="field"><label htmlFor="sp-link">연결할 자사 상품</label><select id="sp-link" value={spForm.linkedProductId} onChange={(event) => sf("linkedProductId", event.target.value)}><option value="">연결 안 함 (소싱 후보)</option>{data.products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></div>
      </div>
      <div className="field" style={{ marginTop: 10 }}><label htmlFor="sp-memo">메모</label><input id="sp-memo" value={spForm.memo} onChange={(event) => sf("memo", event.target.value)} placeholder="견적 유효기간, 단가 조건 등" /></div>
      {error && <p className="decision-error" role="alert">{error}</p>}
      <div className="modal-actions"><Button variant="secondary" onClick={() => setSpForm(null)}>취소</Button><Button disabled={busy} onClick={() => void saveSupplierProduct()}>저장</Button></div>
    </>}</Modal>

    <Modal open={Boolean(deleting)} title={deleting?.kind === "supplier" ? "거래처 삭제" : "공급사 상품 삭제"} onClose={() => setDeleting(null)} width="460px">{deleting && <>
      {deleting.kind === "supplier"
        ? <p>‘{deleting.item.name}’ 거래처를 삭제할까요? 이 거래처의 공급사 상품도 함께 삭제됩니다. 연결된 브랜드({deleting.item.brands.map((brand) => brand.name).join(", ") || "없음"})와 자사 상품은 그대로 남고, 발주서 받는 사람만 비워집니다.</p>
        : <p>‘{deleting.item.name}’ 공급사 상품을 삭제할까요? 연결된 자사 상품은 그대로 남습니다.</p>}
      <div className="modal-actions"><Button variant="secondary" onClick={() => setDeleting(null)}>취소</Button><Button variant="danger" disabled={busy} onClick={async () => { if (await command(deleting.kind === "supplier" ? { type: "DELETE_SUPPLIER", id: deleting.item.id } : { type: "DELETE_SUPPLIER_PRODUCT", id: deleting.item.id })) setDeleting(null); }}>삭제</Button></div>
    </>}</Modal>
  </div></DataBoundary>;
}
