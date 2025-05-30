import React, { useState, useEffect } from 'react';
import { X, User, Mail, Key, Eye, EyeOff } from 'lucide-react';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Podríamos pasar los datos del usuario actual aquí si los tuviéramos disponibles globalmente
  // currentUser: { username: string; email: string; }; 
}

const ProfileEditModal: React.FC<ProfileEditModalProps> = ({ isOpen, onClose }) => {
  // Simular datos del usuario actual (estos vendrían de un estado global o props)
  const [username, setUsername] = useState('ADMIN');
  const [email, setEmail] = useState('Ecoalliance33@gmail.com');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Resetear campos y mensajes cuando se cierra el modal
  useEffect(() => {
    if (!isOpen) {
      // Podríamos resetear al estado original del usuario si lo tuviéramos
      // setUsername('ADMIN'); 
      // setEmail('Ecoalliance33@gmail.com');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setError(null);
      setSuccessMessage(null);
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmNewPassword(false);
    }
  }, [isOpen]);

  const handleSave = () => {
    setError(null);
    setSuccessMessage(null);

    // Validaciones básicas
    if (!username.trim() || !email.trim()) {
      setError('El nombre de usuario y el correo electrónico no pueden estar vacíos.');
      return;
    }
    if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
      setError('El formato del correo electrónico no es válido.');
      return;
    }

    // Validación de contraseña (solo si se intenta cambiar)
    if (newPassword || currentPassword || confirmNewPassword) {
      if (!currentPassword) {
        setError('Por favor, introduce tu contraseña actual para cambiarla.');
        return;
      }
      // Aquí iría una validación de la contraseña actual (simulada)
      // if (currentPassword !== 'contraseña_real_actual') { setError('La contraseña actual es incorrecta.'); return; }
      
      if (newPassword.length < 6 && newPassword.length > 0) {
         setError('La nueva contraseña debe tener al menos 6 caracteres.');
         return;
      }
      if (newPassword !== confirmNewPassword) {
        setError('Las nuevas contraseñas no coinciden.');
        return;
      }
    }
    
    // Simulación de guardado
    console.log('Guardando perfil:', { username, email, newPassword: newPassword ? '******' : 'sin cambios' });
    setSuccessMessage('¡Perfil actualizado con éxito! (Simulación)');
    
    // Opcional: cerrar el modal después de un breve retraso para ver el mensaje
    setTimeout(() => {
        onClose();
    }, 2000);
  };

  if (!isOpen) return null;

  const inputGroupStyle = "relative mb-6";
  const inputStyle = "block w-full px-4 py-3 pl-12 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg focus:ring-sky-500 focus:border-sky-500 transition-colors focus:outline-none";
  const iconStyle = "absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400";
  const passwordToggleStyle = "absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500 cursor-pointer hover:text-sky-600";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 transition-opacity duration-300">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8 m-4 transform transition-all duration-300 scale-100 opacity-100">
        <div className="flex justify-between items-center mb-6 pb-3 border-b border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-800">Editar Perfil</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors rounded-full p-1">
            <X size={28} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-md text-sm">
            {successMessage}
          </div>
        )}

        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">Nombre de Usuario</label>
            <div className={inputGroupStyle}>
                <User className={iconStyle}/>
                <input type="text" id="username" value={username} onChange={(e) => setUsername(e.target.value)} className={inputStyle} placeholder="Tu nombre de usuario"/>
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
             <div className={inputGroupStyle}>
                <Mail className={iconStyle}/>
                <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputStyle} placeholder="tu@correo.com"/>
            </div>
          </div>
          
          <hr className="my-8"/>
          <p className="text-sm text-gray-500 mb-1">Cambiar Contraseña (opcional)</p>

          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">Contraseña Actual</label>
            <div className={inputGroupStyle}>
                <Key className={iconStyle}/>
                <input type={showCurrentPassword ? "text" : "password"} id="currentPassword" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={inputStyle} placeholder="Contraseña actual"/>
                {showCurrentPassword ? <EyeOff className={passwordToggleStyle} onClick={() => setShowCurrentPassword(false)}/> : <Eye className={passwordToggleStyle} onClick={() => setShowCurrentPassword(true)}/>}
            </div>
          </div>

          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">Nueva Contraseña</label>
             <div className={inputGroupStyle}>
                <Key className={iconStyle}/>
                <input type={showNewPassword ? "text" : "password"} id="newPassword" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputStyle} placeholder="Nueva contraseña (mín. 6 car.)"/>
                 {showNewPassword ? <EyeOff className={passwordToggleStyle} onClick={() => setShowNewPassword(false)}/> : <Eye className={passwordToggleStyle} onClick={() => setShowNewPassword(true)}/>}
            </div>
          </div>

          <div>
            <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-gray-700 mb-1">Confirmar Nueva Contraseña</label>
            <div className={inputGroupStyle}>
                <Key className={iconStyle}/>
                <input type={showConfirmNewPassword ? "text" : "password"} id="confirmNewPassword" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} className={inputStyle} placeholder="Confirma la nueva contraseña"/>
                {showConfirmNewPassword ? <EyeOff className={passwordToggleStyle} onClick={() => setShowConfirmNewPassword(false)}/> : <Eye className={passwordToggleStyle} onClick={() => setShowConfirmNewPassword(true)}/>}
            </div>
          </div>

          <div className="flex items-center justify-end space-x-4 pt-4">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="button" 
              onClick={handleSave} 
              className="px-6 py-2.5 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors"
            >
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileEditModal; 