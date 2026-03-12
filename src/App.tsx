import { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, User as FirebaseUser, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { Search, Hammer, User as UserIcon, LogOut, CreditCard, Star, MapPin, Bell, Menu, X, Bolt, Sparkles, MessageCircle, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { GoogleGenAI } from "@google/genai";

// --- Utility ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
type UserRole = 'client' | 'provider';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role?: UserRole;
  category?: string;
  isSubscribed?: boolean;
  credits: number;
  highlightScore: number;
  location?: { address: string; lat: number; lng: number };
}

interface ServiceRequest {
  id: string;
  clientId: string;
  clientName: string;
  category: string;
  description: string;
  status: 'pending' | 'quoted' | 'accepted' | 'completed' | 'cancelled';
  isBoosted: boolean;
  createdAt: any;
}

// --- Components ---

const Button = ({ className, variant = 'primary', ...props }: any) => {
  const variants = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-700',
    secondary: 'bg-zinc-800 text-white hover:bg-zinc-700',
    outline: 'border border-zinc-200 text-zinc-900 hover:bg-zinc-50',
    ghost: 'text-zinc-600 hover:bg-zinc-100',
  };
  return (
    <button
      className={cn(
        'px-4 py-2 rounded-lg font-medium transition-all active:scale-95 disabled:opacity-50',
        variants[variant as keyof typeof variants],
        className
      )}
      {...props}
    />
  );
};

const Card = ({ className, children }: any) => (
  <div className={cn('bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm', className)}>
    {children}
  </div>
);

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'home' | 'search' | 'requests' | 'profile' | 'credits'>('home');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const docRef = doc(db, 'users', firebaseUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        } else {
          // New user
          const newProfile: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || 'Usuário',
            credits: 0,
            highlightScore: 0,
          };
          await setDoc(docRef, newProfile);
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleLogout = () => signOut(auth);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-zinc-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  if (!user) {
    return <LandingPage onLogin={handleLogin} />;
  }

  if (!profile?.role) {
    return <RoleSetup profile={profile!} onComplete={(p) => setProfile(p)} />;
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      <Navbar profile={profile} setView={setView} onLogout={handleLogout} />
      
      <main className="flex-1 container max-w-4xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {view === 'home' && <Home profile={profile} setView={setView} />}
          {view === 'search' && <SearchServices profile={profile} />}
          {view === 'requests' && <Requests profile={profile} />}
          {view === 'profile' && <ProfileView profile={profile} />}
          {view === 'credits' && <CreditsView profile={profile} />}
        </AnimatePresence>
      </main>

      <footer className="bg-white border-t border-zinc-100 py-8 text-center text-zinc-400 text-sm">
        &copy; 2026 Click Service. Todos os direitos reservados.
      </footer>

      <AIChatSupport profile={profile} />
    </div>
  );
}

// --- Sub-pages ---

function LandingPage({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="p-6 flex justify-between items-center">
        <div className="flex items-center gap-2 font-bold text-2xl text-emerald-600">
          <Hammer className="w-8 h-8" />
          <span>Click Service</span>
        </div>
        <Button onClick={onLogin}>Entrar / Cadastrar</Button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center text-center px-6">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl md:text-7xl font-bold tracking-tight text-zinc-900 mb-6"
        >
          Serviços profissionais <br /> <span className="text-emerald-600">a um clique.</span>
        </motion.h1>
        <p className="text-zinc-500 text-xl max-w-2xl mb-12">
          Conectamos você aos melhores prestadores de serviço da sua região. 
          Rápido, seguro e eficiente.
        </p>
        <div className="flex gap-4">
          <Button className="px-8 py-4 text-lg" onClick={onLogin}>Começar Agora</Button>
          <Button variant="outline" className="px-8 py-4 text-lg">Saiba Mais</Button>
        </div>

        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
          {[
            { title: 'Pintura', icon: '🎨' },
            { title: 'Elétrica', icon: '⚡' },
            { title: 'Hidráulica', icon: '🚰' },
            { title: 'Manutenção', icon: '🛠️' },
            { title: 'Entregas', icon: '📦' },
            { title: 'Limpeza', icon: '🧹' },
          ].map((cat) => (
            <div key={cat.title} className="p-6 bg-zinc-50 rounded-2xl text-center">
              <div className="text-4xl mb-4">{cat.icon}</div>
              <h3 className="font-semibold text-zinc-900">{cat.title}</h3>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function RoleSetup({ profile, onComplete }: { profile: UserProfile, onComplete: (p: UserProfile) => void }) {
  const [role, setRole] = useState<UserRole | null>(null);
  const [category, setCategory] = useState('');

  const handleSave = async () => {
    if (!role) return;
    const updatedProfile = { ...profile, role, category: role === 'provider' ? category : undefined };
    await setDoc(doc(db, 'users', profile.uid), updatedProfile);
    onComplete(updatedProfile);
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <h2 className="text-2xl font-bold mb-6 text-center">Como você quer usar o Click Service?</h2>
        <div className="grid grid-cols-2 gap-4 mb-8">
          <button
            onClick={() => setRole('client')}
            className={cn(
              "p-6 rounded-2xl border-2 transition-all text-center flex flex-col items-center gap-3",
              role === 'client' ? "border-emerald-600 bg-emerald-50" : "border-zinc-100 hover:border-zinc-200"
            )}
          >
            <UserIcon className="w-8 h-8 text-emerald-600" />
            <span className="font-semibold">Sou Cliente</span>
          </button>
          <button
            onClick={() => setRole('provider')}
            className={cn(
              "p-6 rounded-2xl border-2 transition-all text-center flex flex-col items-center gap-3",
              role === 'provider' ? "border-emerald-600 bg-emerald-50" : "border-zinc-100 hover:border-zinc-200"
            )}
          >
            <Hammer className="w-8 h-8 text-emerald-600" />
            <span className="font-semibold">Sou Prestador</span>
          </button>
        </div>

        {role === 'provider' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-zinc-700 mb-2">Sua Categoria</label>
            <select 
              className="w-full p-3 rounded-lg border border-zinc-200"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Selecione...</option>
              <option value="pintura">Pintura</option>
              <option value="eletrica">Elétrica</option>
              <option value="hidraulica">Hidráulica</option>
              <option value="manutencao">Manutenção</option>
              <option value="entregas">Entregas</option>
            </select>
          </div>
        )}

        <Button className="w-full py-4 text-lg" disabled={!role || (role === 'provider' && !category)} onClick={handleSave}>
          Continuar
        </Button>
      </Card>
    </div>
  );
}

function Navbar({ profile, setView, onLogout }: { profile: UserProfile, setView: (v: any) => void, onLogout: () => void }) {
  return (
    <nav className="bg-white border-b border-zinc-100 sticky top-0 z-50">
      <div className="container max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 font-bold text-xl text-emerald-600 cursor-pointer" onClick={() => setView('home')}>
            <Hammer className="w-6 h-6" />
            <span>Click Service</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-zinc-500 font-medium">
            <button onClick={() => setView('home')} className="hover:text-emerald-600 transition-colors">Início</button>
            <button onClick={() => setView('search')} className="hover:text-emerald-600 transition-colors">Buscar</button>
            <button onClick={() => setView('requests')} className="hover:text-emerald-600 transition-colors">Pedidos</button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end mr-2">
            <span className="text-sm font-semibold text-zinc-900">{profile.displayName}</span>
            <span className="text-xs text-zinc-400 capitalize">{profile.role === 'provider' ? 'Prestador' : 'Cliente'}</span>
          </div>
          <button onClick={() => setView('credits')} className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
            <Star className="w-4 h-4 fill-emerald-700" />
            {profile.credits}
          </button>
          <button onClick={() => setView('profile')} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
            <UserIcon className="w-6 h-6 text-zinc-600" />
          </button>
          <button onClick={onLogout} className="p-2 hover:bg-red-50 rounded-full transition-colors text-red-500">
            <LogOut className="w-6 h-6" />
          </button>
        </div>
      </div>
    </nav>
  );
}

function Home({ profile, setView }: { profile: UserProfile, setView: (v: any) => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 mb-2">Olá, {profile.displayName.split(' ')[0]}!</h1>
        <p className="text-zinc-500">O que você precisa hoje?</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-bold mb-2">Buscar Serviços</h3>
            <p className="text-zinc-500 mb-6">Encontre profissionais qualificados perto de você.</p>
          </div>
          <Button onClick={() => setView('search')} className="w-full flex items-center justify-center gap-2">
            <Search className="w-5 h-5" />
            Começar Busca
          </Button>
        </Card>

        <Card className="flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-bold mb-2">Meus Pedidos</h3>
            <p className="text-zinc-500 mb-6">Acompanhe o status das suas solicitações.</p>
          </div>
          <Button variant="secondary" onClick={() => setView('requests')} className="w-full flex items-center justify-center gap-2">
            <Bell className="w-5 h-5" />
            Ver Pedidos
          </Button>
        </Card>
      </div>

      {profile.role === 'provider' && !profile.isSubscribed && (
        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-2xl p-6 flex items-start gap-4">
          <div className="bg-amber-100 p-3 rounded-xl">
            <CreditCard className="w-6 h-6 text-amber-700" />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-amber-900 mb-1">Assinatura Pendente</h4>
            <p className="text-amber-800 text-sm mb-4">
              Para aparecer nas buscas e receber solicitações, você precisa ativar sua assinatura mensal de R$19,90.
            </p>
            <Button className="bg-amber-600 hover:bg-amber-700 border-none" onClick={() => setView('credits')}>Ativar Agora</Button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function SearchServices({ profile }: { profile: UserProfile }) {
  const [category, setCategory] = useState('');
  const [providers, setProviders] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState('');
  const [locating, setLocating] = useState(false);

  const handleGetCurrentLocation = () => {
    setLocating(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setAddress("Localização Atual");
          setLocating(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          setLocating(false);
          alert("Não foi possível obter sua localização. Verifique as permissões do navegador.");
        }
      );
    } else {
      alert("Geolocalização não é suportada pelo seu navegador.");
      setLocating(false);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      // In a real app with many users, we'd use GeoFirestore or similar
      // For this implementation, we'll fetch providers and calculate distance client-side
      const q = query(
        collection(db, 'users'),
        where('role', '==', 'provider'),
        where('isSubscribed', '==', true)
      );
      
      const querySnapshot = await getDocs(q);
      let results = querySnapshot.docs.map(doc => doc.data() as UserProfile);

      if (category) {
        results = results.filter(p => p.category === category);
      }

      // Sort by highlightScore first, then by distance if location is available
      results.sort((a, b) => {
        if (b.highlightScore !== a.highlightScore) {
          return b.highlightScore - a.highlightScore;
        }
        
        if (location && a.location && b.location) {
          const distA = Math.sqrt(Math.pow(a.location.lat - location.lat, 2) + Math.pow(a.location.lng - location.lng, 2));
          const distB = Math.sqrt(Math.pow(b.location.lat - location.lat, 2) + Math.pow(b.location.lng - location.lng, 2));
          return distA - distB;
        }
        return 0;
      });

      setProviders(results);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Encontrar Profissionais</h2>
        <FastAIHelp onSelectCategory={(cat) => setCategory(cat)} />
      </div>

      <Card className="mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <select 
              className="w-full p-3 rounded-lg border border-zinc-200"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Todas as Categorias</option>
              <option value="pintura">Pintura</option>
              <option value="eletrica">Elétrica</option>
              <option value="hidraulica">Hidráulica</option>
              <option value="manutencao">Manutenção</option>
              <option value="entregas">Entregas</option>
            </select>
          </div>
          <div className="flex-1 relative">
            <MapPin className="absolute left-3 top-3.5 w-5 h-5 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Sua localização..." 
              className="w-full p-3 pl-10 pr-12 rounded-lg border border-zinc-200"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
            <button 
              onClick={handleGetCurrentLocation}
              className="absolute right-3 top-3 text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
              title="Usar minha localização"
              disabled={locating}
            >
              <Bolt className={cn("w-5 h-5", locating && "animate-pulse")} />
            </button>
          </div>
          <Button onClick={handleSearch} className="px-8" disabled={loading}>
            {loading ? "Buscando..." : "Buscar"}
          </Button>
        </div>
      </Card>

      <div className="space-y-4">
        {providers.length > 0 ? (
          providers.map((p) => (
            <Card key={p.uid} className="flex items-center justify-between hover:border-emerald-200 transition-colors cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center text-2xl">
                  👤
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-zinc-900">{p.displayName}</h4>
                    {p.highlightScore > 0 && (
                      <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">Destaque</span>
                    )}
                  </div>
                  <p className="text-zinc-500 text-sm capitalize">{p.category} • 4.8 ⭐</p>
                  <p className="text-zinc-400 text-xs flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" /> {p.location?.address || "Localização não informada"}
                  </p>
                </div>
              </div>
              <Button variant="outline">Solicitar Orçamento</Button>
            </Card>
          ))
        ) : (
          !loading && (
            <div className="text-center py-12 text-zinc-400">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>Nenhum profissional encontrado. Tente mudar os filtros.</p>
            </div>
          )
        )}
        
        {/* Mock Results if none found to show UI */}
        {providers.length === 0 && !loading && (
          <div className="mt-8">
            <p className="text-xs text-zinc-400 mb-4 uppercase font-bold tracking-widest">Sugestões em destaque</p>
            {[1, 2].map((i) => (
              <Card key={i} className="flex items-center justify-between opacity-60 mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center text-2xl">👤</div>
                  <div>
                    <h4 className="font-bold text-zinc-900">Exemplo Premium {i}</h4>
                    <p className="text-zinc-500 text-sm">Geral • 5.0 ⭐</p>
                  </div>
                </div>
                <Button variant="outline" disabled>Solicitar</Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function AIChatSupport({ profile }: { profile: UserProfile }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    { role: 'ai', text: `Olá ${profile.displayName.split(' ')[0]}! Sou o assistente do Click Service. Como posso ajudar você hoje?` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const chat = ai.chats.create({
        model: "gemini-3.1-flash-lite-preview",
        config: {
          systemInstruction: `Você é o assistente de suporte do Click Service, um marketplace de serviços. 
          O usuário atual é um ${profile.role === 'client' ? 'Cliente' : 'Prestador'}.
          Ajude-o com dúvidas sobre o app, pagamentos, como pedir orçamentos ou como destacar o perfil.
          Seja cordial, prestativo e responda em português do Brasil.
          Mantenha as respostas concisas e úteis.`
        }
      });

      const result = await chat.sendMessage({ message: userMessage });
      setMessages(prev => [...prev, { role: 'ai', text: result.text || 'Desculpe, não consegui processar sua mensagem.' }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'ai', text: 'Ocorreu um erro ao processar sua dúvida. Tente novamente em instantes.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="absolute bottom-16 right-0 w-80 md:w-96 bg-white border border-zinc-100 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            style={{ height: '500px' }}
          >
            {/* Header */}
            <div className="bg-emerald-600 p-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                <span className="font-bold">Suporte IA Click</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50">
              {messages.map((msg, i) => (
                <div key={i} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[80%] p-3 rounded-2xl text-sm shadow-sm",
                    msg.role === 'user' ? "bg-emerald-600 text-white rounded-tr-none" : "bg-white text-zinc-800 rounded-tl-none border border-zinc-100"
                  )}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-zinc-100 shadow-sm">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-zinc-300 rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-zinc-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-1.5 h-1.5 bg-zinc-300 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-zinc-100 flex gap-2">
              <input
                type="text"
                placeholder="Tire sua dúvida..."
                className="flex-1 bg-zinc-100 border-none rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="bg-emerald-600 text-white p-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all active:scale-90",
          isOpen ? "bg-zinc-800 text-white rotate-90" : "bg-emerald-600 text-white hover:bg-emerald-700"
        )}
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>
    </div>
  );
}

function FastAIHelp({ onSelectCategory }: { onSelectCategory: (cat: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAskAI = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const model = ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: `O usuário está procurando um serviço e disse: "${prompt}". 
        Com base nisso, identifique a categoria mais provável entre: pintura, eletrica, hidraulica, manutencao, entregas.
        Responda APENAS com um objeto JSON no formato: {"category": "nome_da_categoria", "reason": "breve explicação em português"}.`,
        config: { responseMimeType: "application/json" }
      });
      
      const res = await model;
      const data = JSON.parse(res.text || '{}');
      
      if (data.category) {
        setResponse(data.reason);
        onSelectCategory(data.category);
      } else {
        setResponse("Não consegui identificar a categoria. Tente descrever de outra forma.");
      }
    } catch (error) {
      console.error("AI Error:", error);
      setResponse("Erro ao consultar o assistente. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-sm font-bold hover:bg-emerald-100 transition-colors"
      >
        <Sparkles className="w-4 h-4" />
        Ajuda IA Rápida
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-2 w-80 bg-white border border-zinc-100 rounded-2xl shadow-xl z-50 p-4"
          >
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-bold text-zinc-900 flex items-center gap-2">
                <Bolt className="w-4 h-4 text-emerald-600" />
                Assistente Click
              </h4>
              <button onClick={() => setIsOpen(false)}><X className="w-4 h-4 text-zinc-400" /></button>
            </div>
            <p className="text-xs text-zinc-500 mb-3">Descreva o que você precisa e eu encontro a categoria certa para você.</p>
            <textarea 
              className="w-full p-3 text-sm rounded-lg border border-zinc-200 mb-3 focus:ring-2 focus:ring-emerald-500 outline-none"
              rows={3}
              placeholder="Ex: Minha torneira está vazando e preciso de alguém urgente..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <Button 
              className="w-full text-sm py-2 flex items-center justify-center gap-2"
              onClick={handleAskAI}
              disabled={loading}
            >
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Analisar Pedido
            </Button>

            {response && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 p-3 bg-emerald-50 rounded-lg text-xs text-emerald-800 border border-emerald-100"
              >
                {response}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Requests({ profile }: { profile: UserProfile }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <h2 className="text-2xl font-bold mb-6">Meus Pedidos</h2>
      <div className="space-y-4">
        <div className="text-center py-12 text-zinc-400">
          <Bell className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p>Você ainda não tem pedidos ativos.</p>
        </div>
      </div>
    </motion.div>
  );
}

function ProfileView({ profile }: { profile: UserProfile }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <h2 className="text-2xl font-bold mb-6">Meu Perfil</h2>
      <Card>
        <div className="flex items-center gap-6 mb-8">
          <div className="w-24 h-24 bg-zinc-100 rounded-full flex items-center justify-center text-4xl">
            👤
          </div>
          <div>
            <h3 className="text-2xl font-bold">{profile.displayName}</h3>
            <p className="text-zinc-500">{profile.email}</p>
            <span className="inline-block mt-2 px-3 py-1 bg-zinc-100 rounded-full text-xs font-bold uppercase tracking-wider text-zinc-600">
              {profile.role === 'provider' ? 'Prestador' : 'Cliente'}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-500 mb-1">Nome de Exibição</label>
            <input type="text" defaultValue={profile.displayName} className="w-full p-3 rounded-lg border border-zinc-200" />
          </div>
          {profile.role === 'provider' && (
            <div>
              <label className="block text-sm font-medium text-zinc-500 mb-1">Categoria</label>
              <input type="text" defaultValue={profile.category} className="w-full p-3 rounded-lg border border-zinc-200" />
            </div>
          )}
          <Button className="w-full">Salvar Alterações</Button>
        </div>
      </Card>
    </motion.div>
  );
}

function CreditsView({ profile }: { profile: UserProfile }) {
  const handlePurchase = async (type: 'subscription' | 'credits', amount: number) => {
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, userId: profile.uid, amount }),
      });
      const { id } = await res.json();
      // In a real app, use loadStripe and redirectToCheckout
      alert(`Redirecionando para pagamento Stripe (Session ID: ${id})`);
    } catch (error) {
      console.error('Payment error:', error);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <h2 className="text-2xl font-bold mb-6">Créditos e Assinatura</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {profile.role === 'provider' && (
          <Card className="border-emerald-100 bg-emerald-50/30">
            <h3 className="text-xl font-bold mb-2">Assinatura Mensal</h3>
            <p className="text-zinc-500 mb-6">Apareça nas buscas e receba solicitações ilimitadas.</p>
            <div className="text-3xl font-bold mb-6">R$ 19,90 <span className="text-sm font-normal text-zinc-400">/mês</span></div>
            <Button className="w-full" onClick={() => handlePurchase('subscription', 1990)}>
              {profile.isSubscribed ? 'Renovar Assinatura' : 'Ativar Agora'}
            </Button>
          </Card>
        )}

        <Card>
          <h3 className="text-xl font-bold mb-2">Comprar Créditos</h3>
          <p className="text-zinc-500 mb-6">Destaque seus pedidos ou seu perfil no topo da lista.</p>
          <div className="space-y-3">
            <button onClick={() => handlePurchase('credits', 1000)} className="w-full flex justify-between items-center p-4 rounded-xl border border-zinc-100 hover:border-emerald-200 transition-colors">
              <span className="font-medium">10 Créditos</span>
              <span className="font-bold text-emerald-600">R$ 10,00</span>
            </button>
            <button onClick={() => handlePurchase('credits', 2500)} className="w-full flex justify-between items-center p-4 rounded-xl border border-zinc-100 hover:border-emerald-200 transition-colors">
              <span className="font-medium">30 Créditos (Bônus!)</span>
              <span className="font-bold text-emerald-600">R$ 25,00</span>
            </button>
            <button onClick={() => handlePurchase('credits', 5000)} className="w-full flex justify-between items-center p-4 rounded-xl border border-zinc-100 hover:border-emerald-200 transition-colors">
              <span className="font-medium">70 Créditos (Melhor Valor)</span>
              <span className="font-bold text-emerald-600">R$ 50,00</span>
            </button>
          </div>
        </Card>
      </div>
    </motion.div>
  );
}
