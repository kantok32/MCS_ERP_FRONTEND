import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Filter, X, ArrowLeft, ArrowRight, Check, Settings, Eye, List, Loader2, LayoutDashboard, FileCog, Users, Menu, Bell, User, SlidersHorizontal, ChevronDown, ChevronUp, UploadCloud, LogOut, History, RefreshCcw } from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import ecoAllianceLogo from './assets/Logotipo_EAX-EA.png';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from './theme'; // <-- Importación nombrada
import ChatWidget, { ChatWidgetHandle } from './components/ChatWidget'; // <-- Importar ChatWidgetHandle
import PerfilesPanel from './pages/PerfilesPanel'; // <-- A PerfilesPanel (default import)

// --- Constants ---
// const sidebarWidth = 220; // Define sidebar width here - Reemplazada por SIDEBAR_WIDTH
const SIDEBAR_WIDTH = 220; // Ancho fijo de la barra lateral
const HEADER_HEIGHT = 60; // Altura fija de la cabecera

// Interfaces
interface Producto {
  codigo_producto?: string;
  nombre_del_producto?: string;
  Descripcion?: string;
  Modelo?: string;
  categoria?: string;
  pf_eur?: string | number;
  dimensiones?: string;
  PESO?: string | null;
  transporte_nacional?: string;
  ay?: string;
}

interface ApiResponse {
  success: boolean;
  data: {
    currencies: {
      dollar: {
        value: number | null;
        last_update: string | null;
        fecha: string | null;
      };
      euro: {
        value: number | null;
        last_update: string | null;
        fecha: string | null;
      };
    };
    products: {
      total: number;
      data: Producto[];
    };
  };
  timestamp: string;
  message?: string;
  error?: string;
}

interface EspecificacionTecnica {
  caracteristica: string;
  especificacion: string;
}

// Interfaz para la respuesta de opcionales
interface OpcionalesResponse {
  total: number;
  products: Producto[];
}

// Definir tipo para los estilos de los enlaces (para legibilidad)
type LinkStyle = React.CSSProperties;

// --- New Header Component ---
interface HeaderProps {
  logoPath: string;
  sidebarWidth: number;
  headerHeight: number;
  username: string;
  email: string;
  onProfileClick: () => void;
  onSimulateProfileChange: () => void;
}

const Header: React.FC<HeaderProps> = ({ logoPath, sidebarWidth, headerHeight, username, email, onProfileClick, onSimulateProfileChange }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    navigate('/login');
  };

  const headerStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    padding: '12px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    color: '#334155',
    height: `${headerHeight}px`,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    borderBottom: '1px solid #e5e7eb',
    flexShrink: 0,
    position: 'relative',
  };

  const logoContainerStyle: React.CSSProperties = {
    width: `${sidebarWidth}px`,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  };

  const logoStyle: React.CSSProperties = {
    height: '40px', 
    width: 'auto',
    display: 'block',
  };

  const rightSectionStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
  };

  const iconStyle: React.CSSProperties = {
    cursor: 'pointer',
    color: '#64748b',
    flexShrink: 0,
  };

  const userInfoContainerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '6px',
  };
  
  const userInfoTextStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    fontSize: '13px',
    lineHeight: '1.4',
    color: '#334155',
    textAlign: 'right',
  };
  const userNameStyle: React.CSSProperties = {
    fontWeight: 500,
  };
  const userEmailStyle: React.CSSProperties = {
    fontSize: '11px',
    color: '#64748b',
  };

  return (
    <header style={headerStyle}>
      <div style={logoContainerStyle}>
        <img src={logoPath} alt="Logo" style={logoStyle} />
        <button 
          onClick={onSimulateProfileChange} 
          title="Simular cambio de perfil (desarrollo)"
          style={{
            position: 'absolute',
            left: '5px',
            top: '5px',
            background: 'transparent',
            border: 'none',
            padding: '5px',
            cursor: 'pointer',
            opacity: 0.6,
          }}
        >
          <RefreshCcw size={14} color="#64748b" />
        </button>
      </div>
      <div style={rightSectionStyle}>
        <div 
          style={userInfoContainerStyle} 
          onClick={onProfileClick} 
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
           <div style={userInfoTextStyle}>
             <span style={userNameStyle}>{username}</span>
             <span style={userEmailStyle}>{email}</span>
           </div>
           <User size={24} style={{...iconStyle, color: '#4b5563', cursor: 'default'}} />
        </div>
        <span title="Cerrar Sesión" onClick={handleLogout} style={{ cursor: 'pointer' }}>
          <LogOut size={20} style={iconStyle} />
        </span>
      </div>
    </header>
  );
};
// --- End Header Component ---

export interface ProfileOutletContextType {
    userProfile: { username: string; email: string; };
    handleProfileUpdate: (newUsername: string, newEmail: string, currentPassword?: string, newPassword?: string) => Promise<void>;
}

// Versión funcional con diseño simplificado
export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const chatWidgetRef = useRef<ChatWidgetHandle>(null);
  
  const [isAdminOpen, setIsAdminOpen] = useState(location.pathname.startsWith('/admin'));
  const [showCostosLink, setShowCostosLink] = useState(() => {
    try { return sessionStorage.getItem('showCostosLink') === 'true'; } 
    catch (e) { console.error('Error leyendo sessionStorage:', e); return false; }
  });

  const [userProfile, setUserProfile] = useState({
    username: 'ADMIN',
    email: 'Ecoalliance33@gmail.com',
  });

  const mockProfiles = [
    { username: 'ADMIN', email: 'Ecoalliance33@gmail.com' },
    { username: 'USER_DEMO', email: 'demo@example.com' },
    { username: 'TEST_USER', email: 'test@example.com' },
    { username: 'Juan Perez', email: 'jperez@cliente.com' },
  ];
  const [currentMockProfileIndex, setCurrentMockProfileIndex] = useState(0);

  const handleSimulateProfileChange = () => {
    const nextIndex = (currentMockProfileIndex + 1) % mockProfiles.length;
    setUserProfile(mockProfiles[nextIndex]);
    setCurrentMockProfileIndex(nextIndex);
  };

  const handleProfileUpdate = async (newUsername: string, newEmail: string, currentPassword?: string, newPassword?: string): Promise<void> => {
    // Simulación de la lógica de actualización del perfil, incluyendo contraseña
    console.log("Intentando actualizar perfil con:", { newUsername, newEmail, currentPassword, newPassword });

    if (newPassword && !currentPassword) {
      console.error("Se proporcionó nueva contraseña pero no la actual.");
      // En una app real, esto se validaría en el frontend antes de llamar aquí,
      // pero es bueno tener una guarda.
      throw new Error("Para cambiar la contraseña, se requiere la contraseña actual.");
    }

    if (newPassword && currentPassword) {
      // Aquí iría la llamada a la API para cambiar la contraseña y el perfil
      // Ejemplo: const response = await api.updateUserProfile({ username: newUsername, email: newEmail, currentPassword, newPassword });
      // if (!response.success) throw new Error(response.message || "Error al actualizar contraseña");
      console.log("SIMULACIÓN: Contraseña actual proporcionada, se procedería a verificar y cambiar.");
      // Simular éxito de cambio de contraseña
      console.log("SIMULACIÓN: Contraseña cambiada con éxito (si la actual fuera correcta).");
    }

    // Actualizar nombre de usuario y email localmente
    setUserProfile({ username: newUsername, email: newEmail });
    console.log("Perfil (nombre/email) actualizado localmente a:", { newUsername, newEmail });
    
    // Considerar si la navegación debe ocurrir aquí o ser manejada por la página que llama
    // navigate('/'); // Navegar a la página de inicio después de actualizar
    // Devolver una promesa resuelta para indicar éxito
    return Promise.resolve();
  };

  const handleNavigateToProfileEdit = () => {
    navigate('/editar-perfil');
  };

  // --- Autenticación Effect ---
  useEffect(() => {
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    // Permitir acceso a /login incluso si no está autenticado
    if (isAuthenticated !== 'true' && location.pathname !== '/login') {
      navigate('/login', { replace: true });
    }
  }, [navigate, location.pathname]); // Se ejecuta en cada cambio de ruta para protegerla

  // Effect to open admin menu if navigating directly to a sub-route
  useEffect(() => {
    setIsAdminOpen(location.pathname.startsWith('/admin'));
  }, [location.pathname]);

  // --- Nuevo useEffect para sincronizar con sessionStorage --- 
  useEffect(() => {
    console.log('App location changed or mounted, checking sessionStorage for showCostosLink...');
    try {
      const storedValue = sessionStorage.getItem('showCostosLink');
      console.log(`Valor encontrado en sessionStorage: ${storedValue}`);
      const shouldShow = storedValue === 'true';
      if (showCostosLink !== shouldShow) { // Actualizar solo si es diferente
        setShowCostosLink(shouldShow);
        console.log(`Estado showCostosLink actualizado a: ${shouldShow}`);
      }
    } catch (e) {
      console.error('Error leyendo sessionStorage en useEffect:', e);
      // Opcional: establecer a false si hay error de lectura?
      // if (showCostosLink) setShowCostosLink(false);
    }
  }, [location.pathname]); // Ejecutar cada vez que cambia la ruta

  // Toggle function for Admin menu
  const toggleAdminMenu = (e: React.MouseEvent) => {
    // Prevent navigation if we are just toggling the already active section
    if (location.pathname.startsWith('/admin')) {
       // e.preventDefault(); // Optional: Uncomment to prevent navigation when toggling within admin
    }
    setIsAdminOpen(!isAdminOpen);
  };

  // Estilos de la aplicación
  const sidebarStyle: React.CSSProperties = {
    width: `${SIDEBAR_WIDTH}px`, // Usa la constante de ancho
    backgroundColor: '#ffffff',
    borderRight: '1px solid #e5e7eb',
    padding: '20px 0', // Padding arriba/abajo, no a los lados
    display: 'flex',
    flexDirection: 'column',
    height: `calc(100vh - ${HEADER_HEIGHT}px)`, // Altura restante después de la cabecera
    overflowY: 'auto', // Scroll si el contenido excede
    flexShrink: 0, // Evita que la barra lateral se encoja
  };

  const logoContainerStyle: React.CSSProperties = {
    marginBottom: '30px',
    paddingLeft: '10px', // Align logo slightly
  };

  const logoImageStyle: React.CSSProperties = {
    height: '40px', // Maintain logo size
    width: 'auto',
  };

  const navLinkBaseStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between', // Make space for chevron
    padding: '10px 15px',
    marginBottom: '8px',
    borderRadius: '6px',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
    color: '#334155', // Default text color
    transition: 'background-color 0.2s ease, color 0.2s ease',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  };

  const navLinkHoverStyle: React.CSSProperties = {
    backgroundColor: '#e2e8f0', // Light hover background
  };

  const navLinkActiveStyle: React.CSSProperties = {
    backgroundColor: '#e0f2fe', // Light blue background for active
    color: '#0c4a6e', // Darker blue text for active
  };

  const navIconStyle: React.CSSProperties = {
    marginRight: '12px',
    flexShrink: 0, // Prevent icon from shrinking
  };

  // Combined style for the text part of the link
  const navLinkTextStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center', 
  };

  // Función para obtener el estilo del enlace dinámicamente
  const getLinkStyle = (path: string, isSubItem: boolean = false): LinkStyle => {
    const isActive = location.pathname === path || (path !== '/' && location.pathname.startsWith(path) && !isSubItem) || (isSubItem && location.pathname === path) ;
    const isAdminActive = path === '/admin' && location.pathname.startsWith('/admin');
    return {
      display: 'flex',
      alignItems: 'center',
      padding: isSubItem ? '10px 10px 10px 40px' : '10px 20px',
      marginBottom: '4px',
      borderRadius: '6px',
      textDecoration: 'none',
      color: (isActive || isAdminActive) ? '#0ea5e9' : '#4b5563', // Azul cielo si activo, gris oscuro si no
      backgroundColor: (isActive || isAdminActive) ? '#e0f2fe' : 'transparent', // Fondo azul claro si activo
      fontWeight: (isActive || isAdminActive) ? 600 : 400, // Más grueso si activo
      transition: 'all 0.2s ease-in-out',
      fontSize: isSubItem ? '13px': '14px',
    };
  };

  const contentStyle: React.CSSProperties = {
    flexGrow: 1, // Ocupa el espacio restante
    overflow: 'auto', // Scroll si el contenido excede
    height: `calc(100vh - ${HEADER_HEIGHT}px)`, // Altura restante después de la cabecera
    // El padding se aplica dentro del componente PageLayout o directamente en las páginas
  };

  // Ejemplo de función que SÍ pertenece a App.tsx (manejo del chat)
  const handleOpenChatClick = () => {
    console.log('[App] Botón flotante clickeado -> Abrir Chat');
    alert('Próximamente'); 
  };
  
  // useEffect para manejar la tecla ESC para modales GLOBALES si los hubiera,
  // pero los modales de EquiposPanel deben ser manejados en EquiposPanel.tsx
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // Lógica para cerrar modales globales de App si existieran
        // Ejemplo: if (isGlobalModalOpen) closeGlobalModal();
      }
    };

    window.addEventListener('keydown', handleEscKey);
    return () => {
      window.removeEventListener('keydown', handleEscKey);
    };
  }, [/* dependencias de modales globales si las hay */]);

  if (location.pathname === '/login') {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Outlet />
      </ThemeProvider>
    );
  }

  const outletContextValue: ProfileOutletContextType = { userProfile, handleProfileUpdate };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <>
        {/* Contenedor principal de la aplicación visible */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
          <Header 
            logoPath={ecoAllianceLogo} 
            sidebarWidth={SIDEBAR_WIDTH} 
            headerHeight={HEADER_HEIGHT} 
            username={userProfile.username}
            email={userProfile.email}
            onProfileClick={handleNavigateToProfileEdit}
            onSimulateProfileChange={handleSimulateProfileChange}
          />
          <div style={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
            <div style={sidebarStyle}>
              <nav style={{ flexGrow: 1, padding: '0 15px' }}>
                {/* Logo dentro de la barra lateral - Opcional, ya está en header */}
                {/* 
                <div style={logoContainerStyle}>
                  <img src={ecoAllianceLogo} alt="Logo" style={logoImageStyle} />
                </div> 
                */}
                <Link to="/dashboard" style={{
                   ...getLinkStyle('/dashboard'),
                   color: '#A0AEC0', 
                   textDecoration: 'line-through',
                }}
                onClick={(e) => {
                  e.preventDefault(); 
                  alert('Próximamente');
                }}
                >
                   <div style={navLinkTextStyle}> 
                     <LayoutDashboard size={18} style={navIconStyle} />
                     DASHBOARD
                   </div>
                </Link>
                <Link to="/equipos" style={getLinkStyle('/equipos')}>
                   <div style={navLinkTextStyle}> 
                     <SlidersHorizontal size={18} style={navIconStyle} /> 
                     EQUIPOS
                   </div>
                </Link>
                <Link to="/historial" style={getLinkStyle('/historial')}>
                   <div style={navLinkTextStyle}> 
                     <History size={18} style={navIconStyle} /> 
                     HISTORIAL
                   </div>
                </Link>
                <Link 
                  to="/admin/perfiles"
                  style={getLinkStyle('/admin')} 
                  onClick={toggleAdminMenu}
                >
                  <div style={navLinkTextStyle}> 
                     <FileCog size={18} style={navIconStyle} />
                     ADMIN
                  </div>
                  {isAdminOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </Link>
                
                {isAdminOpen && (
                  <>
                    {/* --- Enlace Costos Condicional (Comentado para ocultarlo permanentemente por ahora) --- */} 
                    {/* {showCostosLink && (
                        <Link 
                          to="/admin/costos" 
                          style={getLinkStyle('/admin/costos', true)} 
                        >
                           <div style={navLinkTextStyle}> 
                              <SlidersHorizontal size={16} style={{...navIconStyle, marginRight: '8px'}} /> 
                              Costos
                           </div>
                        </Link>
                    )} */}
                    {/* Enlace Perfiles (se mantiene igual) */} 
                    <Link 
                      to="/admin/perfiles" 
                      style={getLinkStyle('/admin/perfiles', true)} 
                    >
                       <div style={navLinkTextStyle}> 
                          <Users size={16} style={{...navIconStyle, marginRight: '8px'}} /> 
                          Perfiles
                       </div>
                    </Link>
                    {/* Enlace Cargar Equipos (se mantiene igual) */} 
                    <Link 
                      to="/admin/carga-equipos" 
                      style={getLinkStyle('/admin/carga-equipos', true)} 
                    >
                       <div style={navLinkTextStyle}> 
                          <UploadCloud size={16} style={{...navIconStyle, marginRight: '8px'}} /> 
                          Cargar Equipos
                       </div>
                    </Link>
                  </>
                )}
              </nav>
            </div>
            <div style={contentStyle}>
              <Outlet context={outletContextValue} />
            </div>
          </div>
          {/* ChatWidget y ProfileEditModal se mueven fuera de este div */}
        </div>
        
        {/* Elementos que deben estar por encima de todo y relativos al viewport */}
        <ChatWidget ref={chatWidgetRef} onBubbleClick={handleOpenChatClick} />
      </>
    </ThemeProvider>
  );
}
