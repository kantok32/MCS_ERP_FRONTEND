import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { User, Mail, Key, Eye, EyeOff } from 'lucide-react';
import type { ProfileOutletContextType } from '../App'; // Importar el tipo del contexto

// --- Estilos para el modo ventana/modal ---
// Overlay que cubre toda la pantalla y centra el contenido
const modalOverlayStyle = "fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-75 p-4 md:p-8 font-sans";

// Contenedor de la "ventana" o "modal"
const modalWindowStyle = "max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-6 md:p-10 lg:p-12 border border-gray-300 transform transition-all"; // Añadido transform para futuras animaciones

// Título dentro de la ventana
const modalHeaderSectionStyle = "mb-6 md:mb-8";
const modalTitleStyle = "text-2xl md:text-3xl font-bold text-gray-800 text-center mb-1"; // Ajustado tamaño y color
const modalSubtitleStyle = "text-sm text-gray-500 text-center mb-6"; // Subtítulo opcional

// Estilos de Alerta (pueden ser los mismos)
const errorAlertStyle = "mb-5 p-3.5 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm";
const successAlertStyle = "mb-5 p-3.5 bg-green-100 border border-green-300 text-green-700 rounded-lg text-sm";

// Espaciado y etiquetas del formulario (pueden ser los mismos)
const formElementSpacing = "space-y-5 md:space-y-6"; 
const labelStyle = "block text-sm font-medium text-gray-600 mb-1.5";
const inputGroupStyle = "relative"; 

// Inputs (pueden ser los mismos, quizás ajustar un poco el foco o borde para el tema modal)
const inputStyle = "block w-full py-3 pl-10 pr-3 text-base text-gray-900 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400 transition";
const iconStyle = "absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400"; 
const passwordToggleStyle = "absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500 cursor-pointer hover:text-blue-600";

// Divisor (puede ser el mismo)
const hrStyle = "my-6 md:my-8 border-gray-200";
// Título de la sección de contraseña (puede ser el mismo, o ajustarlo)
const passwordSectionTitleStyle = "text-md font-semibold text-gray-700 mb-4"; // Ligeramente ajustado

// Grupo de botones (puede ser el mismo, o ajustarlo para el pie del modal)
const buttonGroupStyle = "flex items-center justify-end space-x-3 pt-5 mt-6 border-t border-gray-200"; 

// Botones con estilos más acordes a un modal (ejemplo)
const cancelButtonStyle = "px-6 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition";
const saveButtonStyle = "px-6 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition shadow-sm";

const ProfileEditPage: React.FC = () => {
  const navigate = useNavigate();
  // Usar useOutletContext para obtener los datos y la función de App.tsx
  const { userProfile: currentUser, handleProfileUpdate } = useOutletContext<ProfileOutletContextType>();

  const [username, setUsername] = useState(currentUser.username);
  const [email, setEmail] = useState(currentUser.email);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Actualizar campos si currentUser cambia (ej. si el usuario navega y vuelve, o por simulación)
  useEffect(() => {
    setUsername(currentUser.username);
    setEmail(currentUser.email);
  }, [currentUser]);

  const handleSave = () => {
    setError(null);
    setSuccessMessage(null);

    if (!username.trim() || !email.trim()) {
      setError('El nombre de usuario y el correo electrónico no pueden estar vacíos.');
      return;
    }
    if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
      setError('El formato del correo electrónico no es válido.');
      return;
    }

    if (newPassword || currentPassword || confirmNewPassword) {
      if (!currentPassword) {
        setError('Por favor, introduce tu contraseña actual para cambiarla.');
        return;
      }
      // Aquí iría una validación REAL de la contraseña actual contra el backend
      // if (currentPassword !== 'contraseña_real_actual_del_backend') { setError('La contraseña actual es incorrecta.'); return; }
      
      if (newPassword.length > 0 && newPassword.length < 6) {
         setError('La nueva contraseña debe tener al menos 6 caracteres.');
         return;
      }
      if (newPassword !== confirmNewPassword) {
        setError('Las nuevas contraseñas no coinciden.');
        return;
      }
      // Si se cambia la contraseña, también se debería enviar la nueva contraseña a handleProfileUpdate
      // Por ahora, onProfileUpdate solo toma username y email.
      // Se necesitaría modificar handleProfileUpdate en App.tsx y este llamado si se quiere manejar cambio de contraseña.
    }
    
    handleProfileUpdate(username, email);
    // El navigate ya está en handleProfileUpdate en App.tsx, pero podríamos mostrar un mensaje aquí antes de eso
    setSuccessMessage('¡Perfil actualizado con éxito! Redirigiendo...');
    // No necesitamos el setTimeout para navegar, ya que App.tsx lo hará después de actualizar el estado.
  };

  const handleCancel = () => {
    navigate(-1); // Navegar a la página anterior
  };

  // Las constantes de estilo se definen arriba para mayor claridad.
  
  return (
    <div className={modalOverlayStyle}> {/* Usar el nuevo estilo de overlay */}
      {/* Contenedor de la ventana principal */}
      <div className={modalWindowStyle}> {/* Usar el nuevo estilo de ventana */}
        <header className={modalHeaderSectionStyle}>
          <h1 className={modalTitleStyle}>Editar Perfil</h1>
          {/* <p className={modalSubtitleStyle}>Actualiza tu información personal y contraseña.</p> */}
        </header>

        {error && (
          <div className={errorAlertStyle}>
            {error}
          </div>
        )}
        {successMessage && (
          <div className={successAlertStyle}>
            {successMessage}
          </div>
        )}

        <form onSubmit={(e) => {e.preventDefault(); handleSave();}} className={formElementSpacing}>
          <div>
            <label htmlFor="username" className={labelStyle}>Nombre de Usuario</label>
            <div className={inputGroupStyle}>
                <User className={iconStyle}/>
                <input type="text" id="username" value={username} onChange={(e) => setUsername(e.target.value)} className={inputStyle} placeholder="Tu nombre de usuario"/>
            </div>
          </div>

          <div>
            <label htmlFor="email" className={labelStyle}>Correo Electrónico</label>
             <div className={inputGroupStyle}>
                <Mail className={iconStyle}/>
                <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputStyle} placeholder="tu@correo.com"/>
            </div>
          </div>
          
          <hr className={hrStyle}/>
          <p className={passwordSectionTitleStyle}>Cambiar Contraseña (opcional)</p>

          <div>
            <label htmlFor="currentPassword" className={labelStyle}>Contraseña Actual</label>
            <div className={inputGroupStyle}>
                <Key className={iconStyle}/>
                <input type={showCurrentPassword ? "text" : "password"} id="currentPassword" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={inputStyle} placeholder="Contraseña actual"/>
                {showCurrentPassword ? <EyeOff className={passwordToggleStyle} onClick={() => setShowCurrentPassword(false)}/> : <Eye className={passwordToggleStyle} onClick={() => setShowCurrentPassword(true)}/>}
            </div>
          </div>

          <div>
            <label htmlFor="newPassword" className={labelStyle}>Nueva Contraseña</label>
             <div className={inputGroupStyle}>
                <Key className={iconStyle}/>
                <input type={showNewPassword ? "text" : "password"} id="newPassword" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputStyle} placeholder="Nueva contraseña (mín. 6 car.)"/>
                 {showNewPassword ? <EyeOff className={passwordToggleStyle} onClick={() => setShowNewPassword(false)}/> : <Eye className={passwordToggleStyle} onClick={() => setShowNewPassword(true)}/>}
            </div>
          </div>

          <div>
            <label htmlFor="confirmNewPassword" className={labelStyle}>Confirmar Nueva Contraseña</label>
            <div className={inputGroupStyle}>
                <Key className={iconStyle}/>
                <input type={showConfirmNewPassword ? "text" : "password"} id="confirmNewPassword" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} className={inputStyle} placeholder="Confirma la nueva contraseña"/>
                {showConfirmNewPassword ? <EyeOff className={passwordToggleStyle} onClick={() => setShowConfirmNewPassword(false)}/> : <Eye className={passwordToggleStyle} onClick={() => setShowConfirmNewPassword(true)}/>}
            </div>
          </div>

          <div className={buttonGroupStyle}>
            <button 
              type="button" 
              onClick={handleCancel} 
              className={cancelButtonStyle}
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className={saveButtonStyle}
            >
              Guardar Cambios
            </button>
          </div>
        </form>
      </div> {/* Fin de modalWindowStyle */}
    </div>
  );
};

export default ProfileEditPage; 