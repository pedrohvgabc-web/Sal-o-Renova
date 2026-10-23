import { useEffect, useMemo, useState } from "react";
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import ScrollExpand from "@/components/ScrollExpand";
import GradualBlur from "@/components/GradualBlur";
import InfiniteMenu from "@/components/InfiniteMenu";
import BeforeAfterShowcase from "@/components/BeforeAfterShowcase";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Crown, Heart, Instagram, MapPin, Menu, MessageCircle, Scissors, Sparkles, Star, Bell, X } from "lucide-react";

const SERVICES = [
  { id: "corte", category: "Cabelo", name: "Corte", duration: 60, price: 50, description: "Um corte pensado para acompanhar seu estilo.", image: "/assets/servico-004_5c082af4.png" },
  { id: "cronograma-capilar", category: "Tratamentos", name: "Cronograma capilar", duration: 90, price: 387, description: "Hidratação, nutrição e reconstrução.", image: "/assets/cronograma-capilar-pdf.jpg" },
  { id: "hidratacao-escova", category: "Tratamentos", name: "Hidratação + escova", duration: 90, price: 75, originalPrice: 100, description: "Cuidado, maciez e finalização com condição promocional.", image: "/assets/servico-002_62214ed8.jpg" },
  { id: "coloracao", category: "Coloração", name: "Coloração", duration: 150, price: 120, description: "Uma nova cor para valorizar sua beleza.", image: "/assets/servico-001_9546a145.jpg" },
  { id: "moreno-iluminado", category: "Cabelo", name: "Moreno iluminado", duration: 240, price: 350, description: "Luz e profundidade para um resultado natural.", image: "/assets/servico-001_bda3d642.png" },
  { id: "loiro-iluminado", category: "Cabelo", name: "Loiro iluminado", duration: 240, price: 420, description: "Iluminação delicada e radiante.", image: "/assets/loiro-iluminado-depois-pdf.jpg" },
  { id: "argiloterapia-capilar", category: "Tratamentos", name: "Argiloterapia", duration: 60, price: 120, description: "Cuidado profundo para couro cabeludo e fios.", image: "/assets/servico-002_62214ed8.jpg" },
  { id: "loiro", category: "Cabelo", name: "Loiro", duration: 240, price: 450, description: "Clareamento pensado para iluminar seu visual.", image: "/assets/servico-004_5c082af4.png" },
  { id: "botox-capilar", category: "Tratamentos", name: "Botox capilar", duration: 150, price: 0, description: "Tratamento disponível com Bianca.", image: "/assets/servico-003_93fc31da.jpg" },
  { id: "selagem-organica", category: "Tratamentos", name: "Selagem orgânica", duration: 150, price: 0, description: "Alinhamento, brilho e movimento.", image: "/assets/servico-000_1544592d.jpg" },
  { id: "escova", category: "Cabelo", name: "Escova", duration: 60, price: 0, description: "Finalização disponível com Bianca.", image: "/assets/servico-002_ce4aa40e.png" },
] as const;
const AMANDA_SERVICE_IDS = ["corte", "cronograma-capilar", "hidratacao-escova", "coloracao", "moreno-iluminado", "loiro-iluminado", "argiloterapia-capilar", "loiro"] as const;
const BIANCA_SERVICE_IDS = ["hidratacao-escova", "botox-capilar", "selagem-organica", "escova"] as const;
const PROFESSIONALS = [{ id: "amanda", name: "Amanda Vieira", role: "Atendimento personalizado" }, { id: "bianca", name: "Bianca", role: "Atendimento personalizado" }] as const;
const SHOWCASE_ITEMS = [
  { title: "Loiros", description: "Clareamento com brilho, técnica e personalidade.", image: "/assets/loiros_1ea264d9.jpeg", link: "https://www.instagram.com/p/DcPQngUNCPm/?stkn=MXE3cWVwZGtkZXRwdg==" },
  { title: "Morenos iluminados", description: "Luz e profundidade para um resultado natural.", image: "/assets/morenos-iluminados_276ab0da.jpeg", link: "https://www.instagram.com/p/DWOsbCBDrbz/?stkn=MTZzbTA3NjU0cXNkcw==" },
  { title: "Selagem", description: "Fios alinhados, macios e cheios de movimento.", image: "/assets/selagem_ad9b7707.jpeg", link: "https://www.instagram.com/p/Dbdazp7jutU/?stkn=bGN6d2QwMXBjdjZo" },
  { title: "Visite nosso Instagram para mais!!!", description: "Veja inspirações, resultados e novidades do Renova.", image: "/assets/instagram-renova_d914535a.jpeg", link: "https://www.instagram.com/renovapvh?stkn=NmF4aXZ3a2xzbXho" },
] as const;
const ALL_HOURS = ["08:30", "09:30", "10:30", "11:30", "12:30", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30"];
const baseHoursForDate = (dateKey: string, professionalId: "amanda" | "bianca") => { const day = new Date(`${dateKey}T12:00:00`).getDay(); if (day === 0) return []; if (day === 6) return ["08:30", "09:30", "14:00", "15:00"]; return professionalId === "amanda" ? ["14:00"] : ["08:30", "14:00"]; };
const addHour = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  const end = hours * 60 + minutes + 60;
  return `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`;
};
const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
const keyFor = (date: Date) => format(date, "yyyy-MM-dd");
const serviceFor = (id: string) => SERVICES.find(service => service.id === id) ?? SERVICES[0];
const priceLabel = (service: typeof SERVICES[number]) => (service as { originalPrice?: number }).originalPrice ? `${money((service as { originalPrice: number }).originalPrice)} · ${money(service.price)} promoção` : service.price === 0 ? "Consultar valor" : ["corte", "cronograma-capilar", "argiloterapia-capilar"].includes(service.id) ? money(service.price) : `A partir de ${money(service.price)}`;
const decodeVapidKey = (base64:string) => { const padding = "=".repeat((4 - base64.length % 4) % 4); const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(Array.from(raw).map(char => char.charCodeAt(0))); };


export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => keyFor(new Date()));
  const [serviceId, setServiceId] = useState("corte");
  const [bookingStep, setBookingStep] = useState<1 | 2 | 3>(1);
  const [serviceNotice, setServiceNotice] = useState<(typeof SERVICES)[number] | null>(null);
  const [summaryClosing, setSummaryClosing] = useState(false);
  const [professionalId, setProfessionalId] = useState<"amanda" | "bianca">("amanda");
  const [selectedHours, setSelectedHours] = useState<string[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [confirmed, setConfirmed] = useState<{ code: string } | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  const [lookupWhatsApp, setLookupWhatsApp] = useState("");
  const [showLookup, setShowLookup] = useState(false);
  const [showManagementGate, setShowManagementGate] = useState(false);
  const [managementPassword, setManagementPassword] = useState("");
  const [managementError, setManagementError] = useState("");
  const [pushStatus, setPushStatus] = useState<"idle" | "loading" | "enabled" | "denied">("idle");
  const [feedbackName, setFeedbackName] = useState("");
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const service = serviceFor(serviceId);
  const availableServiceIds = professionalId === "amanda" ? AMANDA_SERVICE_IDS : BIANCA_SERVICE_IDS;
  const availableServices = SERVICES.filter(item => availableServiceIds.some(id => id === item.id));
  const { data: pushKey } = trpc.push.publicKey.useQuery();
  const subscribePush = trpc.push.subscribe.useMutation();
  const { data: reservations = [], isFetching: loadingAvailability, refetch: refetchAvailability } = trpc.reservations.byDate.useQuery({ date: selectedDate, professionalId });
  const { data: blockedSlots = [], refetch: refetchBlocked } = trpc.availability.blockedByDate.useQuery({ date: selectedDate, professionalId });
  const { data: releasedSlots = [] } = trpc.availability.releasedByDate.useQuery({ date: selectedDate, professionalId });
  const createReservation = trpc.reservations.create.useMutation({ onSuccess: result => { setSummaryClosing(true); window.setTimeout(() => { setConfirmed({ code: result.bookingCode }); setServiceNotice(null); setSummaryClosing(false); setSelectedHours([]); setCustomerName(""); setWhatsapp(""); }, 320); void refetchAvailability(); toast.success("Agendamento recebido com sucesso!"); }, onError: error => toast.error(error.message) });
  const { data: mine = [], refetch: refetchMine, isFetching: loadingMine } = trpc.reservations.mine.useQuery({ whatsapp: lookupWhatsApp }, { enabled: false });
  const cancelReservation = trpc.reservations.cancel.useMutation({ onSuccess: () => { toast.success("Agendamento cancelado."); void refetchMine(); void refetchAvailability(); }, onError: error => toast.error(error.message) });
  const createFeedback = trpc.feedbacks.create.useMutation({ onSuccess: () => { toast.success("Obrigada por compartilhar seu feedback com o Renova!"); setFeedbackName(""); setFeedbackRating(5); setFeedbackMessage(""); }, onError: error => toast.error(error.message) });
  const calendarDays = useMemo(() => eachDayOfInterval({ start: startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 }) }), [viewMonth]);
  const occupied = useMemo(() => { const counts = new Map<string, number>(); reservations.forEach(reservation => { if (reservation.status === "cancelled") return; try { (JSON.parse(reservation.reservedHours) as string[]).forEach(hour => counts.set(hour, (counts.get(hour) ?? 0) + 1)); } catch { counts.set(reservation.startTime, (counts.get(reservation.startTime) ?? 0) + 1); } }); return counts; }, [reservations]);
  const isHourAvailable = (label: string) => (occupied.get(label) ?? 0) < 2 && !blockedSlots.some(slot => slot.startTime === label);
  const morningDiscount = selectedHours.some(hour => Number(hour.slice(0, 2)) < 11) ? service.price * selectedHours.length * .15 : 0;
  const total = service.price * selectedHours.length - morningDiscount;
  const selectedDateLabel = new Date(`${selectedDate}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
  const availableHours = useMemo(() => Array.from(new Set([...baseHoursForDate(selectedDate, professionalId), ...releasedSlots.map(slot => slot.startTime)])).sort(), [selectedDate, professionalId, releasedSlots]);
  useEffect(() => { const timer = window.setTimeout(() => setShowSplash(false), 1800); return () => window.clearTimeout(timer); }, []);
  useEffect(() => { const observer = new IntersectionObserver(entries => entries.forEach(entry => entry.isIntersecting && entry.target.classList.add("is-visible")), { threshold: .12 }); document.querySelectorAll(".reveal").forEach(element => observer.observe(element)); return () => observer.disconnect(); }, []);
  const scrollTo = (id: string) => { document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); setMenuOpen(false); };
  const enterManagement = (event: React.FormEvent) => { event.preventDefault(); if (managementPassword === "2104" || managementPassword === "0102") { sessionStorage.setItem("renova-management-code", managementPassword); window.location.href = "/gestao"; return; } setManagementError("Senha incorreta."); };
  const selectService = (id: string) => { const next = serviceFor(id); setServiceId(id); setSelectedHours([]); setServiceNotice(next); };
  const selectProfessional = (id: "amanda" | "bianca") => { const nextServices = id === "amanda" ? AMANDA_SERVICE_IDS : BIANCA_SERVICE_IDS; const nextServiceId = nextServices.some(item => item === serviceId) ? serviceId : nextServices[0]; setProfessionalId(id); setServiceId(nextServiceId); setSelectedHours([]); setServiceNotice(serviceFor(nextServiceId)); };
  const changeService = (id: string) => { selectService(id); scrollTo("booking"); };
  const enablePush = async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !pushKey?.publicKey) { toast.error("Este navegador não oferece notificações push."); return; }
    setPushStatus("loading");
    try {
      const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
      if (permission !== "granted") { setPushStatus("denied"); toast.error("Permita as notificações do navegador para receber os avisos."); return; }
      const registration = await navigator.serviceWorker.register("/push-sw.js");
      const current = await registration.pushManager.getSubscription();
      const subscription = current ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeVapidKey(pushKey.publicKey) });
      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) throw new Error("Não foi possível registrar este navegador.");
      await subscribePush.mutateAsync({ endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } });
      setPushStatus("enabled"); toast.success("Notificações do Renova ativadas neste navegador.");
    } catch (error) { setPushStatus("idle"); toast.error(error instanceof Error ? error.message : "Não foi possível ativar as notificações."); }
  };

  const handleReserve = (event: React.FormEvent) => { event.preventDefault(); if (!selectedHours.length) return toast.error("Escolha pelo menos um horário."); if (customerName.trim().length < 2 || whatsapp.trim().length < 8) return toast.error("Preencha seu nome e WhatsApp."); createReservation.mutate({ customerName, whatsapp, reservationDate: selectedDate, startTimes: selectedHours, serviceId: serviceId as "corte" | "cronograma-capilar" | "hidratacao-escova" | "coloracao" | "moreno-iluminado" | "loiro-iluminado" | "argiloterapia-capilar" | "loiro" | "botox-capilar" | "selagem-organica" | "escova", professionalId, extras: [], amountCents: Math.round(total * 100) }); };
  const handleFeedbackSubmit = (event: React.FormEvent) => { event.preventDefault(); if (feedbackName.trim().length < 2 || feedbackMessage.trim().length < 10) return toast.error("Preencha seu nome e conte um pouco sobre sua experiência."); createFeedback.mutate({ customerName: feedbackName.trim(), rating: feedbackRating, message: feedbackMessage.trim() }); };
  const logoUrl = import.meta.env.VITE_APP_LOGO || "/assets/renova-favicon-source_54f0a92b.png";
  return <><div className={`splash-screen ${showSplash ? "" : "splash-screen-hidden"}`} aria-hidden={!showSplash}><img src={logoUrl} alt="Renova Salão de Beleza" /></div><div className="renova-page"><header className="renova-header"><div className="container nav-inner">{menuOpen && <button className="mobile-menu-backdrop" onClick={() => setMenuOpen(false)} aria-label="Fechar menu" />}<button onClick={() => scrollTo("top")} className="logo-button" aria-label="Ir para o início"><img src="/assets/renova-logo_fb46241f.png" alt="Renova Salão de Beleza" /></button><button type="button" className="feedback-header-link" onClick={() => scrollTo("feedback")}>Nos dê um feedback</button><nav className={menuOpen ? "mobile-nav open" : "mobile-nav"}><button onClick={() => scrollTo("about")}>O Renova</button><button onClick={() => scrollTo("services")}>Serviços</button><button onClick={() => scrollTo("portfolio")}>Portfólio</button><button onClick={() => scrollTo("booking")}>Agendar</button><button onClick={() => setShowLookup(true)}>Meus agendamentos</button><button onClick={() => { setShowManagementGate(true); setMenuOpen(false); }}>Gestão</button><button className="push-menu-button" onClick={enablePush} disabled={pushStatus === "loading" || pushStatus === "enabled"}><Bell /> {pushStatus === "loading" ? "Ativando..." : pushStatus === "enabled" ? "Novidades ativadas" : "Quer receber as novidades da Renova?"}</button></nav><Button onClick={() => setShowLookup(true)} className="gold-button hidden sm:flex">Meus agendamentos</Button><Button onClick={() => scrollTo("booking")} className="gold-button hidden lg:flex">Agendar horário <ChevronRight className="ml-1 h-4 w-4" /></Button><button className="mobile-lookup-button md:hidden" onClick={() => setShowLookup(true)} aria-label="Consultar meus agendamentos">Meus horários</button><button className="menu-toggle md:hidden" onClick={() => setMenuOpen(value => !value)} aria-label={menuOpen ? "Fechar menu" : "Abrir menu"} aria-expanded={menuOpen}>{menuOpen ? <X /> : <Menu />}</button></div></header>
    <main id="top">
      <section className="renova-hero relative min-h-[90vh] flex items-center overflow-hidden">
        <div className="hero-photo-layer absolute inset-0 z-0">
          <div className="hero-photo-overlay absolute inset-0 z-10" />
          <img
            src="/assets/hero-renova-pdf.jpg"
            alt=""
            className="hero-photo w-full h-full object-cover object-center"
          />
        </div>
        <div className="hero-orb hero-orb-one" aria-hidden="true" />
        <div className="hero-orb hero-orb-two" aria-hidden="true" />
        <div className="hero-ring hero-ring-one" aria-hidden="true" />
        <div className="hero-frame" aria-hidden="true" />

        <div className="container relative z-20 pt-20">
          <div className="max-w-3xl">
            <div className="eyebrow reveal is-visible flex items-center gap-3 !text-rose-300 mb-6">
              <Sparkles className="h-4 w-4" />
              <span>Beleza que renova a alma</span>
            </div>
            <h1 className="display reveal is-visible text-white text-6xl md:text-8xl mb-8 leading-[0.95]">
              Seu momento<br />
              <em className="text-[var(--rose-300)] italic not-underline">começa aqui.</em>
            </h1>
            <p className="hero-copy reveal is-visible text-zinc-300 text-xl md:text-2xl leading-relaxed mb-10 max-w-2xl">
              Uma experiência de cuidado autêntico, onde cada detalhe é pensado para elevar sua autoestima e bem-estar.
            </p>
            <div className="hero-actions reveal is-visible flex flex-wrap items-center gap-6">
              <Button onClick={() => scrollTo("booking")} className="gold-button h-14 px-10 text-lg shadow-2xl">
                Agendar meu horário <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
              <button onClick={() => scrollTo("services")} className="text-white hover:text-[var(--rose-300)] transition-colors font-medium flex items-center gap-2">
                Conhecer serviços <span className="text-xl">↓</span>
              </button>
            </div>

            <div className="hero-note mt-16 flex items-center gap-4 text-zinc-400 text-sm bg-white/5 backdrop-blur-md w-fit p-3 px-6 rounded-full border border-white/10">
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full bg-[var(--rose-400)] border-2 border-[#20191b] flex items-center justify-center text-[10px] font-bold text-[var(--plum)]">AV</div>
                <div className="w-8 h-8 rounded-full bg-zinc-600 border-2 border-[#20191b] flex items-center justify-center text-[10px] font-bold text-white">BI</div>
              </div>
              <span>Atendimento personalizado · Seg a Sáb</span>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#20191b] to-transparent z-10" />
      </section>
    <section id="booking" className="section booking-section py-32 bg-[#251f21] text-white">
      <div className="container">
        <div className="section-heading reveal mb-16 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div><p className="eyebrow text-[var(--rose-400)]">Agenda inteligente</p><h2 className="serif-title text-white text-5xl md:text-6xl">Seu horário,<br /><span className="text-[var(--rose-300)] italic">do seu jeito.</span></h2></div>
          <p className="text-zinc-400 max-w-sm text-base leading-relaxed">Escolha a profissional primeiro. Depois veja somente os horários e serviços disponíveis para ela.</p>
        </div>
        <div className="booking-flow-shell">
          <div className="booking-flow-progress" aria-label="Etapas do agendamento"><button type="button" className={bookingStep === 1 ? "active" : "done"} onClick={() => setBookingStep(1)}><span>01</span><strong>Sua profissional</strong></button><i /><button type="button" className={bookingStep === 2 ? "active" : bookingStep > 2 ? "done" : ""} disabled={bookingStep < 2} onClick={() => setBookingStep(2)}><span>02</span><strong>Agenda e horário</strong></button><i /><button type="button" className={bookingStep === 3 ? "active" : ""} disabled={bookingStep < 3} onClick={() => setBookingStep(3)}><span>03</span><strong>Serviços</strong></button></div>
          <div className="booking-flow-viewport"><div className={`booking-flow-track booking-flow-step-${bookingStep}`}>
            <section className="booking-flow-pane booking-panel reveal"><div className="step-title"><span>01</span><div><b>Sua profissional</b><small>Escolha quem cuidará do seu momento</small></div></div><div className="professional-list booking-professional-choice">{PROFESSIONALS.map(item => <button type="button" key={item.id} className={`single-professional ${professionalId === item.id ? "selected" : ""}`} onClick={() => selectProfessional(item.id)}><span className="professional-avatar">{item.id === "amanda" ? "AV" : "BI"}</span><span><b>{item.name}</b><small>{item.role}</small></span>{professionalId === item.id && <Check />}</button>)}</div><div className="booking-schedule-note"><Clock3 /><span>{professionalId === "amanda" ? "Amanda atende de segunda a sexta às 14h e tem horários especiais aos sábados." : "Bianca atende de segunda a sexta às 8h30 e 14h, além dos horários de sábado."}</span></div><Button type="button" className="gold-button booking-next-button" onClick={() => setBookingStep(2)}>Avançar <ChevronRight /></Button></section>
            <section className="booking-flow-pane booking-panel"><div className="calendar-head"><div><div className="step-title"><span>02</span><div><b>Agenda e horário</b><small>Disponibilidade individual de {professionalId === "amanda" ? "Amanda" : "Bianca"}</small></div></div><h3>{format(viewMonth, "MMMM yyyy", { locale: ptBR })}</h3></div><div><button className="calendar-arrow" aria-label="Mês anterior" onClick={() => setViewMonth(subMonths(viewMonth, 1))}><ChevronLeft /></button><button className="calendar-arrow" aria-label="Próximo mês" onClick={() => setViewMonth(addMonths(viewMonth, 1))}><ChevronRight /></button></div></div><div className="weekdays">{["seg", "ter", "qua", "qui", "sex", "sáb", "dom"].map(day => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{calendarDays.map(day => { const dayKey = keyFor(day); return <button key={dayKey} aria-pressed={dayKey === selectedDate} aria-label={format(day, "d 'de' MMMM", { locale: ptBR })} onClick={() => { setSelectedDate(dayKey); setSelectedHours([]); }} className={`${!isSameMonth(day, viewMonth) ? "muted" : ""} ${dayKey === selectedDate ? "selected" : ""} ${isSameDay(day, new Date()) ? "today" : ""}`}>{format(day, "d")}</button>; })}</div><div className="time-heading"><div className="step-title"><span>⌁</span><div><b>Horários disponíveis</b><small>{loadingAvailability ? "Atualizando disponibilidade..." : `${selectedDateLabel} · até 2 clientes por horário`}</small></div></div><span className="chosen-count">{selectedHours.length} selecionado{selectedHours.length === 1 ? "" : "s"}</span></div><div className="time-grid">{availableHours.map(label => { const available = isHourAvailable(label); return <button key={label} aria-pressed={selectedHours.includes(label)} disabled={!available} onClick={() => setSelectedHours(current => current.includes(label) ? current.filter(item => item !== label) : [...current, label].sort())} className={`${selectedHours.includes(label) ? "active" : ""} ${!available ? "busy" : ""}`}>{label}{!available && <small>lotado</small>}{available && (occupied.get(label) ?? 0) === 1 && <small>1 vaga</small>}</button>; })}</div><div className="booking-pane-actions"><button type="button" className="booking-back-button" onClick={() => setBookingStep(1)}>Voltar</button><Button type="button" className="gold-button" disabled={!selectedHours.length} onClick={() => setBookingStep(3)}>Avançar <ChevronRight /></Button></div></section>
            <section className="booking-flow-pane booking-panel"><div className="step-title"><span>03</span><div><b>Serviços</b><small>Escolha o cuidado para {professionalId === "amanda" ? "Amanda" : "Bianca"}</small></div></div><div className="selected-service"><img src={service.image} alt={service.name} /><div><span>{service.category}</span><strong>{service.name}</strong><small>{service.duration} min · {priceLabel(service)}</small></div><Scissors /></div><div className="service-mini-list">{availableServices.map(item => <button type="button" key={item.id} className={serviceId === item.id ? "active" : ""} onClick={() => selectService(item.id)}><img src={item.image} alt="" /><span>{item.name}</span></button>)}</div><form className="booking-final-form" onSubmit={handleReserve}><div className="booking-final-summary"><span><small>Profissional</small><strong>{professionalId === "amanda" ? "Amanda Vieira" : "Bianca"}</strong></span><span><small>Data e horário</small><strong>{selectedDateLabel} · {selectedHours.join(" · ")}</strong></span><span><small>Valor</small><strong>{priceLabel(service)}</strong></span></div><Input required value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Seu nome" /><Input required value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="Número de WhatsApp" /><div className="booking-pane-actions"><button type="button" className="booking-back-button" onClick={() => setBookingStep(2)}>Voltar</button><Button type="submit" className="gold-button" disabled={createReservation.isPending}>{createReservation.isPending ? "Enviando..." : "Finalizar atendimento"}</Button></div></form></section>
          </div></div>
        </div>
      </div>
    </section>
    <BeforeAfterShowcase />
    <section className="renova-scroll-story"><ScrollExpand src="/assets/renova-cabelo-aprimorada_9afddfdf.png" alt="Resultado de cabelo realizado no salão Renova" title="Seu cuidado, seu ritual." scrollHint="Continue rolando" startWidth={70} startHeight={68} mediaZoom={1.16} scrollDistance={0.34} holdDistance={0.12}><h2>Beleza que <em>renova.</em></h2><p>Um momento pensado para desacelerar, cuidar de você e sair ainda mais confiante.</p><a href="#services">Conhecer serviços</a></ScrollExpand></section>
    <section id="about" className="section bg-[var(--paper)] py-32 text-zinc-900">
      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="reveal">
            <p className="eyebrow text-[var(--rose-700)]">O Manifesto Renova</p>
            <h2 className="serif-title text-zinc-900 text-5xl md:text-6xl mb-8">
              Mais que um salão.<br />
              <span className="text-[var(--rose-700)] italic">Um refúgio para a alma.</span>
            </h2>
            <p className="text-zinc-600 text-lg leading-relaxed mb-8">
              O Renova nasceu da convicção de que o cuidado pessoal deve ser um ritual sagrado e descomplicado. Um espaço onde o tempo desacelera, a atenção é exclusiva e o resultado revela a sua melhor versão.
            </p>

            <div className="grid grid-cols-3 gap-6 pt-6 border-t border-zinc-200">
              <div>
                <span className="block font-serif text-3xl text-[var(--rose-700)] mb-1">01</span>
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Exclusividade</span>
              </div>
              <div>
                <span className="block font-serif text-3xl text-[var(--rose-700)] mb-1">02</span>
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Acolhimento</span>
              </div>
              <div>
                <span className="block font-serif text-3xl text-[var(--rose-700)] mb-1">03</span>
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Aparência</span>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="aspect-[4/5] rounded-[32px] overflow-hidden shadow-2xl">
              <img
                src="/assets/renova-refugio_f5b376e3.jpg"
                alt="Cliente Renova em um momento de beleza"
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="mt-4 bg-white/90 backdrop-blur-md p-5 rounded-2xl border border-white/40 shadow-xl w-full sm:absolute sm:-bottom-8 sm:-left-8 sm:mt-0 sm:w-auto sm:max-w-xs">
              <p className="font-serif italic text-base leading-relaxed text-zinc-800 sm:text-lg">“Cada detalhe foi desenhado para ser o seu melhor momento do dia.”</p>
              <p className="text-[10px] text-rose-700 font-bold uppercase tracking-wider mt-3">— Amanda Vieira</p>
            </div>
          </div>
        </div>
      </div>
    </section>
    <section id="services" className="section bg-[#20191b] py-32 text-white">
      <div className="container">
        <div className="section-heading reveal flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-20">
          <div>
            <p className="eyebrow text-[var(--rose-400)]">Menu Exclusivo</p>
            <h2 className="serif-title text-white text-5xl md:text-6xl">
              Rituais pensados para<br />
              <span className="text-[var(--rose-300)] italic">o seu momento.</span>
            </h2>
          </div>
          <p className="text-zinc-400 max-w-md text-base leading-relaxed">
            Valores iniciais e estimativa de tempo para você planejar seu dia com tranquilidade.
          </p>
        </div>

        <div className="service-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {SERVICES.map((item, index) => (
            <button
              key={item.id}
              onClick={() => changeService(item.id)}
              className={`service-card group text-left bg-[#2a2124] border border-white/5 hover:border-[var(--rose-300)]/40 rounded-[28px] overflow-hidden transition-all duration-500 hover:-translate-y-2`}
            >
              <div className="service-image-wrap aspect-[4/3] overflow-hidden relative">
                <img
                  src={item.image}
                  alt={item.name}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold tracking-widest text-white uppercase">
                  {item.category}
                </div>
              </div>

              <div className="p-8">
                <h3 className="font-serif text-2xl font-medium text-white mb-3 group-hover:text-[var(--rose-300)] transition-colors">
                  {item.name}
                </h3>
                <p className="text-zinc-400 text-sm leading-relaxed mb-6 line-clamp-2">
                  {item.description}
                </p>
                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <span className="text-[var(--rose-300)] font-bold text-lg">{priceLabel(item)}</span>
                  <span className="text-zinc-500 text-xs flex items-center gap-1.5">
                    <Clock3 className="w-3.5 h-3.5" /> {item.duration} min
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
    <section id="portfolio" className="section instagram-testimonial-section"><div className="container"><div className="section-heading reveal"><div><p className="eyebrow">relato real</p><h2 className="serif-title light">Relato de uma<br /><span>das nossas clientes.</span></h2></div><p>Um pouco da experiência de quem já viveu seu momento Renova.</p></div><div className="instagram-testimonial-card reveal delay-1"><video className="instagram-testimonial-video" controls playsInline preload="none" poster="/assets/hero-renova-pdf.jpg"><source src="/assets/relato-renova_b4c4bd4e.mp4" type="video/mp4" />Seu navegador não suporta a reprodução de vídeo.</video><div className="instagram-testimonial-caption"><span><Instagram /> @renovapvh</span><a href="https://www.instagram.com/reel/DLLEHDLpx14/?obrf=MTAxeXhnYmdkbncwOA==" target="_blank" rel="noreferrer">Ver no Instagram <ChevronRight /></a></div></div></div></section><section className="section contact-section"><div className="container contact-card reveal"><div><p className="eyebrow dark">visite o renova</p><h2 className="serif-title">Seu cuidado<br /><span>tem endereço.</span></h2></div><div className="contact-details"><strong>Rua Mangueira, nº 881</strong><span>Bairro Nova Floresta</span><span>Segundo andar · subindo a escada caracol</span><a href="https://wa.me/5569992076811?text=Olá%20Renova!%20Gostaria%20de%20agendar%20um%20horário." target="_blank" rel="noreferrer" className="gold-button contact-whatsapp"><MessageCircle /> Falar no WhatsApp</a></div></div></section><section className="section policy-section"><div className="container policy-grid"><div className="reveal"><p className="eyebrow dark">tranquilidade para todos</p><h2 className="serif-title">Reserve com<br /><span>responsabilidade.</span></h2></div><div className="policy-card reveal delay-1"><div className="policy-icon"><Clock3 /></div><div><h3>Política de cancelamento</h3><p>Cancelamentos sem custo até 6 horas antes do atendimento. Depois desse prazo, poderá ser aplicada uma taxa de reserva. O aviso aparece antes da confirmação para você decidir com clareza.</p></div></div><div className="policy-card reveal delay-2"><div className="policy-icon"><Star /></div><div><h3>Clube Renova</h3><p>Cadastre-se, acumule pontos e receba uma condição especial na primeira visita. Clientes que voltam mais aproveitam mais.</p><button onClick={() => toast.success("Cadastro do Clube Renova em breve!")} className="inline-cta">Quero fazer parte <ChevronRight /></button></div></div></div></section>
    <section className="section testimonial-section"><div className="container testimonial-inner"><div className="reveal"><p className="eyebrow">quem vive, recomenda</p><div className="stars">★★★★★</div><blockquote>“Saí me sentindo renovada de verdade. O atendimento foi cuidadoso do começo ao fim.”</blockquote><cite>— Mariana, cliente Renova</cite></div><div className="testimonial-side reveal delay-1"><p>Seu próximo momento de cuidado está a poucos cliques.</p><Button onClick={() => scrollTo("booking")} className="gold-button">Agendar agora <ChevronRight className="ml-1 h-4 w-4" /></Button></div></div></section>
    <section className="section showcase-section"><div className="container"><div className="section-heading showcase-heading reveal"><div><p className="eyebrow">inspirações renova</p><h2 className="serif-title light">Quer ver como<br /><span>a gente faz?</span></h2></div><p>Arraste a esfera para explorar os resultados que combinam com o seu próximo momento.</p></div><div className="reactbits-menu-shell"><InfiniteMenu items={SHOWCASE_ITEMS} scale={1.6} backgroundColor="#302925" /></div></div></section>
    
    <section id="feedback" className="section feedback-section"><div className="container feedback-layout"><div className="feedback-intro reveal"><p className="eyebrow">sua experiência importa</p><h2 className="serif-title light">Nos dê um <span>feedback.</span></h2><p>Seu olhar ajuda o Renova a cuidar cada vez melhor de cada detalhe.</p></div><form className="feedback-form reveal delay-1" onSubmit={handleFeedbackSubmit}><div className="feedback-form-grid"><label>Seu nome<Input required maxLength={120} value={feedbackName} onChange={event => setFeedbackName(event.target.value)} placeholder="Como podemos chamar você?" /></label><div className="feedback-rating-field"><span>Como foi sua experiência?</span><div className="feedback-rating" role="radiogroup" aria-label="Nota da experiência">{[1, 2, 3, 4, 5].map(value => <button type="button" key={value} className={value <= feedbackRating ? "selected" : ""} onClick={() => setFeedbackRating(value)} role="radio" aria-checked={value === feedbackRating} aria-label={`${value} ${value === 1 ? "estrela" : "estrelas"}`}><Star /></button>)}</div></div></div><label>Conte para a gente<Textarea className="feedback-textarea" required maxLength={1000} value={feedbackMessage} onChange={event => setFeedbackMessage(event.target.value)} placeholder="O que você mais gostou no seu momento Renova?" /></label><div className="feedback-form-footer"><small>Seu feedback será lido com carinho pela equipe Renova.</small><Button type="submit" className="gold-button" disabled={createFeedback.isPending}>{createFeedback.isPending ? "Enviando…" : "Enviar feedback"}<ChevronRight className="ml-1 h-4 w-4" /></Button></div></form></div></section><footer className="renova-footer"><div className="container footer-grid"><div><img loading="lazy" decoding="async" src="/assets/renova-logo_fb46241f.png" alt="Renova Salão de Beleza" className="footer-logo" /><p>Beleza, cuidado e tempo para você.</p></div><div><b>Renova Salão de Beleza</b><span><MapPin /> Rua Mangueira, nº 881 · Nova Floresta</span><span><Clock3 /> Seg–sex 14h–19h · sáb 8h30–19h</span><span>2º andar · escada caracol</span></div><div><b>Fale com a gente</b><button onClick={() => window.open("https://wa.me/5569992076811?text=Olá%20Renova!%20Gostaria%20de%20agendar%20um%20horário.", "_blank")} className="whatsapp-link"><MessageCircle /> Falar no WhatsApp</button><a href="#portfolio"><Instagram /> Instagram</a></div></div><div className="container footer-bottom">© 2026 Renova Salão de Beleza <span>Feito para o seu momento.</span></div></footer></main><a className="whatsapp-float" href="https://wa.me/5569992076811?text=Olá%20Renova!%20Gostaria%20de%20agendar%20um%20horário." target="_blank" rel="noreferrer" aria-label="Falar com o Renova pelo WhatsApp"><MessageCircle /><span>Falar no WhatsApp</span></a>
    {confirmed && <div className="modal-backdrop"><div className="confirm-modal"><button onClick={() => setConfirmed(null)} className="modal-close" aria-label="Fechar"><X /></button><div className="success-mark"><Check /></div><p className="eyebrow dark">agendamento recebido</p><h2 className="serif-title">Obrigada por<br /><span>agendar com o Renova.</span></h2><p>Seu agendamento já foi recebido. Guarde seu código <b>{confirmed.code}</b>. {professionalId === "amanda" ? "Amanda Vieira" : "Bianca"} entrará em contato pelo WhatsApp informado para confirmar todos os detalhes.</p><div className="modal-actions"><a href="https://wa.me/5569992076811?text=Ol%C3%A1%20vim%20do%20site%20Renova!%20" target="_blank" rel="noreferrer" className="gold-button"><MessageCircle /> Falar no WhatsApp</a><button onClick={() => setConfirmed(null)} className="booking-back-button">Fechar</button></div></div></div>}
    {showManagementGate && <div className="modal-backdrop"><form className="lookup-modal management-gate-modal" onSubmit={enterManagement}><button type="button" onClick={() => setShowManagementGate(false)} className="modal-close" aria-label="Fechar"><X /></button><p className="eyebrow dark">área de gestão</p><h2 className="serif-title">Renova <span>Gestão.</span></h2><p>Digite a senha para acessar a agenda e organizar os horários do salão.</p><Input autoFocus type="password" value={managementPassword} onChange={event => { setManagementPassword(event.target.value); setManagementError(""); }} placeholder="Senha de acesso" />{managementError && <small className="management-gate-error">{managementError}</small>}<Button type="submit" className="gold-button management-gate-submit">Entrar na gestão</Button></form></div>}
    {showLookup && <div className="modal-backdrop"><div className="lookup-modal"><button onClick={() => setShowLookup(false)} className="modal-close" aria-label="Fechar"><X /></button><p className="eyebrow dark">área da cliente</p><h2 className="serif-title">Meus <span>agendamentos.</span></h2><p>Consulte ou cancele seus atendimentos usando o mesmo WhatsApp informado na reserva.</p><div className="lookup-row"><Input value={lookupWhatsApp} onChange={e => setLookupWhatsApp(e.target.value)} placeholder="WhatsApp com DDD" /><Button onClick={() => void refetchMine()} className="gold-button">Consultar</Button></div>{loadingMine && <p>Buscando...</p>}{mine.map(item => <div key={item.id} className="lookup-item"><div><b>{item.reservationDate} · {item.startTime}</b><small>{item.bookingCode} · {item.status === "cancelled" ? "cancelado" : "confirmado"}</small></div>{item.status !== "cancelled" && <button onClick={() => cancelReservation.mutate({ bookingCode: item.bookingCode, whatsapp: lookupWhatsApp })}>Cancelar</button>}</div>)}<div className="lookup-actions"><button type="button" onClick={() => setShowLookup(false)} className="lookup-exit">Sair da consulta</button></div></div></div>}
  </div></>;
}
