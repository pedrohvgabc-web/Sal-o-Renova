import { useMemo, useState } from "react";
import { addWeeks, eachDayOfInterval, endOfWeek, format, isSameDay, startOfWeek, subWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, LogOut, Plus, Scissors, Star, Trash2, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const SERVICES = [
  { id: "selagem-organica", name: "Selagem Orgânica" },
  { id: "coloracao", name: "Coloração" },
  { id: "argiloterapia-capilar", name: "Argiloterapia Capilar" },
  { id: "coloracao-mechas", name: "Coloração + Mechas" },
  { id: "loiro", name: "Loiro" },
  { id: "loiro-iluminado", name: "Loiro Iluminado" },
  { id: "moreno-iluminado", name: "Moreno iluminado" },
  { id: "hidratacao-escova", name: "Hidratação e escova" },
] as const;
const WEEKDAY_HOURS = ["14:00", "15:00", "16:00", "17:00", "18:00"];
const SATURDAY_HOURS = ["08:30", "09:30", "10:30", "11:30", "12:30", "13:30", "14:30", "15:30", "16:30", "17:30", "18:30"];
const PROFESSIONALS = [{ id: "amanda", name: "Amanda Vieira" }, { id: "bianca", name: "Bianca" }] as const;
const keyFor = (date: Date) => format(date, "yyyy-MM-dd");
const hoursFor = (date: Date) => date.getDay() === 6 ? SATURDAY_HOURS : date.getDay() >= 1 && date.getDay() <= 5 ? WEEKDAY_HOURS : [];
const LEGACY_SERVICE_NAMES: Record<string, string> = { loiros: "Loiros", moreno: "Moreno iluminado", selagem: "Selagem", argiloterapia: "Argiloterapia", cronograma: "Cronograma capilar" };
const serviceName = (raw: string) => SERVICES.find(item => item.id === raw)?.name ?? LEGACY_SERVICE_NAMES[raw] ?? raw;
const parseService = (raw: string) => { try { return serviceName((JSON.parse(raw) as string[])[0] ?? ""); } catch { return "Atendimento"; } };

type Professional = "amanda" | "bianca";
type AccessCode = "2104" | "0102";
type Reservation = { professionalId: Professional; id: number; customerName: string; whatsapp: string; reservationDate: string; startTime: string; endTime: string; resources: string; status: "confirmed" | "cancelled" };
type BlockedSlot = { id: number; blockDate: string; startTime: string; professionalId: Professional; reason: string | null };

export default function Management() {
  const [accessCode, setAccessCode] = useState(() => sessionStorage.getItem("renova-management-code") || "");
  const [accessInput, setAccessInput] = useState("");
  const [accessError, setAccessError] = useState("");
  const [selectedProfessional, setSelectedProfessional] = useState<Professional>(() => sessionStorage.getItem("renova-management-code") === "0102" ? "bianca" : "amanda");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [formOpen, setFormOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [serviceId, setServiceId] = useState<(typeof SERVICES)[number]["id"]>("selagem-organica");
  const [reservationDate, setReservationDate] = useState(keyFor(new Date()));
  const [startTime, setStartTime] = useState("14:00");
  const [blockOpen, setBlockOpen] = useState(false);
  const [blockDate, setBlockDate] = useState(keyFor(new Date()));
  const [blockTime, setBlockTime] = useState("14:00");
  const [blockReason, setBlockReason] = useState("");
  const [activePanel, setActivePanel] = useState<"agenda" | "feedbacks">("agenda");

  const isAmanda = accessCode === "2104";
  const agendaProfessional: Professional = isAmanda ? selectedProfessional : "bianca";
  const weekDays = useMemo(() => eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart, { weekStartsOn: 1 }) }), [weekStart]);
  const range = useMemo(() => ({ startDate: keyFor(weekDays[0]), endDate: keyFor(weekDays[6]) }), [weekDays]);
  const enabled = accessCode === "2104" || accessCode === "0102";
  const weekQuery = trpc.management.week.useQuery({ ...range, accessCode: accessCode as AccessCode }, { enabled });
  const blockedQuery = trpc.management.blocked.useQuery({ ...range, accessCode: accessCode as AccessCode }, { enabled });
  const feedbackQuery = trpc.feedbacks.list.useQuery({ accessCode: accessCode as AccessCode }, { enabled });
  const utils = trpc.useUtils();
  const createManual = trpc.management.create.useMutation({ onSuccess: () => { toast.success("Atendimento adicionado à agenda."); setFormOpen(false); setCustomerName(""); setWhatsapp(""); void utils.management.week.invalidate(); }, onError: error => toast.error(error.message) });
  const deleteManual = trpc.management.delete.useMutation({ onSuccess: () => { toast.success("Atendimento excluído."); void utils.management.week.invalidate(); }, onError: error => toast.error(error.message) });
  const blockSlot = trpc.management.block.useMutation({ onSuccess: () => { toast.success("Horário bloqueado para novas reservas."); setBlockOpen(false); setBlockReason(""); void utils.management.blocked.invalidate(); }, onError: error => toast.error(error.message) });
  const unblockSlot = trpc.management.unblock.useMutation({ onSuccess: () => { toast.success("Horário liberado."); void utils.management.blocked.invalidate(); }, onError: error => toast.error(error.message) });
  const removeFeedback = trpc.feedbacks.delete.useMutation({ onSuccess: () => { toast.success("Feedback removido."); void utils.feedbacks.list.invalidate(); }, onError: error => toast.error(error.message) });

  const allReservations = (weekQuery.data ?? []) as Reservation[];
  const reservations = allReservations.filter(item => isAmanda || item.professionalId === "bianca");
  const blockedSlots = (blockedQuery.data ?? []) as BlockedSlot[];
  const feedbacks = feedbackQuery.data ?? [];
  const todayKey = keyFor(new Date());
  const todayCount = reservations.filter(item => item.reservationDate === todayKey && item.status !== "cancelled").length;
  const nextCount = reservations.filter(item => item.reservationDate >= todayKey && item.status !== "cancelled").length;
  const availableFormHours = hoursFor(new Date(`${reservationDate}T12:00:00`));

  function submitAccess(event: React.FormEvent) {
    event.preventDefault();
    if (accessInput === "2104" || accessInput === "0102") {
      sessionStorage.setItem("renova-management-code", accessInput);
      setAccessCode(accessInput);
      setSelectedProfessional(accessInput === "0102" ? "bianca" : "amanda");
      setAccessError("");
    } else setAccessError("Senha incorreta.");
  }
  const changeDate = (date: string) => { setReservationDate(date); setStartTime(hoursFor(new Date(`${date}T12:00:00`))[0] ?? "14:00"); };
  const sortedForDay = (day: Date) => reservations.filter(item => item.reservationDate === keyFor(day) && item.status !== "cancelled").sort((a, b) => a.startTime.localeCompare(b.startTime));
  const blockedForDay = (day: Date) => blockedSlots.filter(item => item.blockDate === keyFor(day));
  const openBlockFor = (day: Date) => { const date = keyFor(day); setBlockDate(date); setBlockTime(hoursFor(day)[0] ?? "14:00"); setBlockOpen(true); };
  const submitManual = (event: React.FormEvent) => { event.preventDefault(); createManual.mutate({ accessCode: accessCode as AccessCode, customerName, whatsapp, reservationDate, startTime, serviceId, professionalId: agendaProfessional }); };
  const submitBlock = (event: React.FormEvent) => { event.preventDefault(); blockSlot.mutate({ accessCode: accessCode as AccessCode, blockDate, startTime: blockTime, reason: blockReason || undefined }); };

  if (!enabled) return <div className="management-login"><form className="management-login-card" onSubmit={submitAccess}><div className="management-mark">R</div><p className="management-kicker">área reservada</p><h1>Renova <span>Gestão</span></h1><p>Digite a senha para organizar a agenda e os atendimentos do salão.</p><input className="management-access-input" autoFocus type="password" value={accessInput} onChange={event => { setAccessInput(event.target.value); setAccessError(""); }} placeholder="Senha de acesso" />{accessError && <small className="management-gate-error">{accessError}</small>}<Button type="submit" className="management-primary management-submit">Entrar na gestão</Button></form></div>;

  return <div className="management-page">
    <header className="management-header"><div className="management-brand"><div className="management-brand-icon">R</div><div><strong>Renova <span>Gestão</span></strong><small>{isAmanda ? "Amanda · visão geral" : "Bianca · minha agenda"}</small></div></div><div className="management-header-actions"><span className="management-user"><UserRound /> Acesso por senha</span><button className="management-home" onClick={() => { window.location.href = "/"; }}>Voltar ao início</button><button className="management-logout" onClick={() => { sessionStorage.removeItem("renova-management-code"); setAccessCode(""); }}><LogOut /> Sair</button></div></header>
    <main className="management-main"><div className="management-title-row"><div><p className="management-kicker">visão geral</p><h1>Agenda <span>{isAmanda ? "compartilhada." : "da Bianca."}</span></h1><p className="management-subtitle">{isAmanda ? "Os atendimentos da Bianca aparecem suavizados para não sobrepor sua agenda." : "Você visualiza e gerencia somente os seus atendimentos."}</p></div><Button onClick={() => setFormOpen(true)} className="management-primary"><Plus /> Novo atendimento</Button></div>
      <div className="management-view-tabs" role="tablist" aria-label="Seções da gestão"><button type="button" className={activePanel === "agenda" ? "active" : ""} onClick={() => setActivePanel("agenda")} role="tab" aria-selected={activePanel === "agenda"}>Agenda</button><button type="button" className={activePanel === "feedbacks" ? "active" : ""} onClick={() => setActivePanel("feedbacks")} role="tab" aria-selected={activePanel === "feedbacks"}>Feedbacks <span>{feedbacks.length}</span></button></div>
      <div className={activePanel === "agenda" ? "management-agenda-panel" : "management-agenda-panel management-panel-hidden"}>
      {isAmanda && <div className="professional-tabs">{PROFESSIONALS.map(item => <button type="button" key={item.id} className={selectedProfessional === item.id ? "active" : ""} onClick={() => setSelectedProfessional(item.id)}>Agenda da {item.name}</button>)}</div>}
      <section className="management-stats"><div><span>Esta semana</span><strong>{reservations.length}</strong><small>atendimentos na agenda</small></div><div><span>Hoje</span><strong>{todayCount}</strong><small>atendimentos marcados</small></div><div><span>Próximos</span><strong>{nextCount}</strong><small>reservas confirmadas</small></div><div><span>Profissional</span><strong>{agendaProfessional === "amanda" ? "Amanda" : "Bianca"}</strong><small>agenda selecionada</small></div></section>
      <section className="week-toolbar"><button onClick={() => setWeekStart(subWeeks(weekStart, 1))} aria-label="Semana anterior"><ChevronLeft /></button><div><strong>{format(weekStart, "d", { locale: ptBR })} — {format(weekDays[6], "d 'de' MMMM", { locale: ptBR })}</strong><button onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))} className="today-button">Ir para hoje</button></div><button onClick={() => setWeekStart(addWeeks(weekStart, 1))} aria-label="Próxima semana"><ChevronRight /></button></section>
      <section className="week-board">{weekDays.map(day => { const dayReservations = sortedForDay(day); const dayBlocked = blockedForDay(day); const closed = hoursFor(day).length === 0; return <div key={keyFor(day)} className={`day-column ${isSameDay(day, new Date()) ? "day-today" : ""}`}><div className="day-heading"><span>{format(day, "EEE", { locale: ptBR }).replace(".", "")}</span><strong>{format(day, "dd")}</strong><small>{format(day, "MMM", { locale: ptBR })}</small></div><div className="day-body">{closed ? <div className="day-closed">Fechado</div> : <>{dayReservations.length === 0 && dayBlocked.length === 0 && <div className="day-empty"><CalendarDays /><span>Agenda livre</span></div>}{dayReservations.map(item => <article className={`appointment-card ${item.professionalId === "bianca" && isAmanda ? "appointment-bianca" : ""}`} key={item.id}><div className="appointment-time"><Clock3 /> {item.startTime}<small>até {item.endTime}</small></div><strong>{item.customerName}</strong><span>{parseService(item.resources)}</span>{isAmanda && <small className="appointment-professional">{item.professionalId === "bianca" ? "Bianca" : "Amanda"}</small>}<small className="appointment-phone">{item.whatsapp}</small>{item.professionalId === (isAmanda ? "amanda" : "bianca") && <button className="appointment-delete" aria-label={`Excluir atendimento de ${item.customerName}`} onClick={() => { if (window.confirm(`Excluir o atendimento de ${item.customerName}?`)) deleteManual.mutate({ accessCode: accessCode as AccessCode, id: item.id }); }}><Trash2 /></button>}</article>)}{dayBlocked.map(slot => <article className="blocked-card" key={slot.id}><div><Clock3 /> {slot.startTime}</div><small>{slot.reason || "Compromisso pessoal"}</small><button onClick={() => unblockSlot.mutate({ accessCode: accessCode as AccessCode, id: slot.id })} aria-label={`Liberar ${slot.startTime}`}><X /></button></article>)}<button type="button" className="day-block-button" onClick={() => openBlockFor(day)}><Plus /> Bloquear horário</button></>}</div></div>; })}</section>
      <p className="management-footnote"><Scissors /> Os atendimentos feitos pelo site público aparecem aqui automaticamente. Você também pode lançar reservas feitas pelo WhatsApp ou presencialmente.</p>
      </div>
      <section className={activePanel === "feedbacks" ? "feedback-management-panel" : "feedback-management-panel management-panel-hidden"} aria-labelledby="feedback-management-title"><div className="feedback-management-header"><div><p className="management-kicker">voz das clientes</p><h2 id="feedback-management-title">Feedbacks <span>recebidos.</span></h2><p>Leia com calma as experiências compartilhadas pelo público do Renova.</p></div><div className="feedback-management-total"><strong>{feedbacks.length}</strong><span>avaliações<br />recebidas</span></div></div>{feedbackQuery.isLoading ? <div className="feedback-admin-empty">Carregando feedbacks…</div> : feedbacks.length === 0 ? <div className="feedback-admin-empty"><Star /><strong>Ainda não há feedbacks</strong><span>Quando uma cliente enviar uma avaliação, ela aparecerá aqui.</span></div> : <div className="feedback-admin-grid">{feedbacks.map(item => <article className="feedback-admin-card" key={item.id}><div className="feedback-admin-card-top"><div className="feedback-admin-stars" aria-label={`${item.rating} de 5 estrelas`}>{[1, 2, 3, 4, 5].map(value => <Star key={value} className={value <= item.rating ? "filled" : ""} />)}</div><time>{new Date(item.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}</time></div><p>“{item.message}”</p><div className="feedback-admin-card-footer"><strong>{item.customerName}</strong><button type="button" onClick={() => { if (window.confirm(`Remover o feedback de ${item.customerName}?`)) removeFeedback.mutate({ accessCode: accessCode as AccessCode, id: item.id }); }}><Trash2 /> Remover</button></div></article>)}</div>}</section>
    </main>
    {blockOpen && <div className="management-modal-backdrop"><form className="management-form" onSubmit={submitBlock}><button type="button" onClick={() => setBlockOpen(false)} className="management-close"><X /></button><p className="management-kicker">indisponibilidade</p><h2>Bloquear <span>horário.</span></h2><p className="management-form-copy">Esse horário não aparecerá para novas clientes no site.</p><div className="management-form-grid"><label>Dia<input type="date" required value={blockDate} onChange={event => { const date = event.target.value; setBlockDate(date); setBlockTime(hoursFor(new Date(`${date}T12:00:00`))[0] ?? "14:00"); }} /></label><label>Horário<select value={blockTime} onChange={event => setBlockTime(event.target.value)}>{hoursFor(new Date(`${blockDate}T12:00:00`)).map(hour => <option key={hour} value={hour}>{hour}</option>)}</select></label></div><label>Motivo (opcional)<Input value={blockReason} onChange={event => setBlockReason(event.target.value)} placeholder="Ex.: compromisso pessoal" /></label><Button type="submit" disabled={blockSlot.isPending} className="management-primary management-submit">{blockSlot.isPending ? "Bloqueando…" : "Bloquear horário"}</Button></form></div>}
    {formOpen && <div className="management-modal-backdrop"><form className="management-form" onSubmit={submitManual}><button type="button" onClick={() => setFormOpen(false)} className="management-close"><X /></button><p className="management-kicker">lançamento manual</p><h2>Novo <span>atendimento.</span></h2><p className="management-form-copy">Cadastre uma cliente que marcou pelo WhatsApp ou presencialmente.</p><label>Nome da cliente<Input required value={customerName} onChange={event => setCustomerName(event.target.value)} placeholder="Ex.: Mariana Silva" /></label><label>WhatsApp<Input required value={whatsapp} onChange={event => setWhatsapp(event.target.value)} placeholder="(69) 99999-9999" /></label><label>Serviço<select value={serviceId} onChange={event => setServiceId(event.target.value as typeof serviceId)}>{SERVICES.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Profissional<select disabled={!isAmanda} value={agendaProfessional} onChange={event => setSelectedProfessional(event.target.value as Professional)}><option value="amanda">Amanda Vieira</option><option value="bianca">Bianca</option></select></label><div className="management-form-grid"><label>Dia<input type="date" required value={reservationDate} onChange={event => changeDate(event.target.value)} /></label><label>Horário<select value={startTime} onChange={event => setStartTime(event.target.value)}>{availableFormHours.map(hour => <option key={hour} value={hour}>{hour}</option>)}</select></label></div><Button type="submit" disabled={createManual.isPending} className="management-primary management-submit">{createManual.isPending ? "Salvando…" : "Adicionar à agenda"}</Button></form></div>}
  </div>;
}
