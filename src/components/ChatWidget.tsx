import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Send, MessageSquare, X, Minus, Loader2 } from 'lucide-react';
import './ChatWidget.css'; // Crearemos este archivo para los estilos

// --- Definición de ProductTable (Movido aquí) ---
// (Asegúrate que la interfaz Product aquí y abajo coincidan)
interface ProductForTable {
  codigo_producto?: string;
  nombre_del_producto?: string;
  Modelo?: string;
  Categoria?: string;
  // Añade otros campos si los necesitas
}

interface ProductTableProps {
  products: ProductForTable[];
}

const ProductTable: React.FC<ProductTableProps> = ({ products }) => {
  if (!products || products.length === 0) {
    return <p>No hay productos para mostrar.</p>;
  }
  const headers = ['Código', 'Nombre', 'Modelo', 'Categoría'];
  return (
    <div className="product-table-container">
      <table>
        <thead>
          <tr>
            {headers.map(header => <th key={header}>{header}</th>)}
          </tr>
        </thead>
        <tbody>
          {products.map((product, index) => (
            <tr key={product.codigo_producto || index}> 
              <td>{product.codigo_producto || '-'}</td>
              <td>{product.nombre_del_producto || '-'}</td>
              <td>{product.Modelo || '-'}</td>
              <td>{product.Categoria || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
// --- Fin Definición de ProductTable ---

// Interfaz para los datos generales del producto (puede ser la misma)
interface Product {
  codigo_producto?: string;
  nombre_del_producto?: string;
  Modelo?: string;
  Categoria?: string;
  // Añade otros campos que quieras mostrar en la tabla
}

// Actualizar interfaz Message para incluir tipo y datos de producto
interface Message {
  sender: 'user' | 'bot';
  type: 'text' | 'table'; // Tipo de mensaje
  text?: string; // Opcional si es tabla
  products?: Product[]; // Opcional si es texto
}

// --- Interfaces para Props y Handle --- 
interface ChatWidgetProps {
  onBubbleClick: () => void; // Función a ejecutar al hacer clic en la burbuja
}

export interface ChatWidgetHandle {
  openChat: () => void;
}

// --- Modificar definición del componente --- 
const ChatWidget = forwardRef<ChatWidgetHandle, ChatWidgetProps>((props, ref) => {
  // Acceder a onBubbleClick desde props
  const { onBubbleClick } = props;

  // --- Estados internos (permanecen aquí) ---
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const backendUrl = 'https://mcs-erp-backend-807184488368.southamerica-west1.run.app/api/langchain/chat';

  // --- Exponer método openChat usando useImperativeHandle ---
  useImperativeHandle(ref, () => ({
    openChat: () => {
      console.log('[ChatWidget] Abriendo chat via ref...');
      setIsOpen(true);
      if (messages.length === 0) {
         // Mensaje inicial del bot si se abre por primera vez via ref
         setMessages([{ sender: 'bot', text: '¡Hola! Soy EcoAsistente. ¿En qué puedo ayudarte hoy?', type: 'text' }]);
      }
      // Enfocar input al abrir
      // Usar setTimeout para asegurar que el input esté renderizado
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }));

  // --- Funciones internas --- 
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Función para MINIMIZAR/CERRAR desde el header del chat
  const handleToggleWindow = () => {
     setIsOpen(!isOpen);
     // Podríamos añadir lógica de reset aquí si quisiéramos que cerrar siempre resetee
     // handleCloseAndReset(); // Descomentar si cerrar desde el header debe resetear
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  const sendMessage = useCallback(async () => {
    const userMessage = inputValue.trim();
    if (!userMessage) return;

    // Log ANTES de enviar
    console.log('[ChatWidget] Enviando mensaje. Conversation ID actual:', conversationId);

    // Añadir mensaje del usuario al chat (siempre es de tipo texto)
    setMessages(prev => [...prev, { sender: 'user', text: userMessage, type: 'text' }]);
    setInputValue('');
    setIsLoading(true);

    // Prepara el cuerpo de la solicitud, incluyendo el conversationId si existe
    const requestBody: { message: string; conversationId?: string } = { 
      message: userMessage 
    };
    if (conversationId) {
      requestBody.conversationId = conversationId;
    }

    try {
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        // Intentar obtener más detalles del error si es posible
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido del servidor' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const botResponseText = data.response; // Respuesta del agente

      // --- Procesar respuesta del bot ---
      const tablePrefix = "PRODUCTS_TABLE::";
      let botMessage: Message;

      if (typeof botResponseText === 'string' && botResponseText.startsWith(tablePrefix)) {
        try {
          const jsonString = botResponseText.substring(tablePrefix.length);
          const productsData = JSON.parse(jsonString);
          if (Array.isArray(productsData) && productsData.length > 0) {
            // Crear mensaje de tipo tabla
            botMessage = { sender: 'bot', type: 'table', products: productsData };
            console.log('[ChatWidget] Mostrando tabla de productos.');
          } else {
            // Si el JSON está vacío o no es array, mostrar texto genérico
            botMessage = { sender: 'bot', type: 'text', text: "Se encontraron algunos productos, pero no se pueden mostrar en tabla." };
            console.warn('[ChatWidget] Se recibió prefijo de tabla, pero los datos no son válidos.', productsData);
          }
        } catch (parseError) {
          console.error('[ChatWidget] Error al parsear JSON de productos:', parseError);
          // Fallback a mensaje de texto si falla el parseo
          botMessage = { sender: 'bot', type: 'text', text: "Recibí una lista de productos, pero hubo un problema al mostrarla." };
        }
      } else {
        // Respuesta normal de texto
        botMessage = { sender: 'bot', type: 'text', text: botResponseText || "No se recibió respuesta." };
      }

      // Añadir el mensaje procesado del bot al estado
      setMessages(prev => [...prev, botMessage]);
      // --- Fin Procesar respuesta del bot ---

      // Actualizar el conversationId
      if (data.conversationId) {
        console.log('[ChatWidget] Recibido/Actualizado Conversation ID desde backend:', data.conversationId);
        setConversationId(data.conversationId);
      }

    } catch (error) {
      console.error("Error al enviar mensaje:", error);
      const errorMessage = error instanceof Error ? error.message : 'Error de conexión con el asistente.';
      setMessages(prev => [...prev, { sender: 'bot', type: 'text', text: `Lo siento, hubo un error: ${errorMessage}` }]);
    } finally {
      setIsLoading(false);
      // Enfocar input después de recibir respuesta
      inputRef.current?.focus(); 
    }
  }, [inputValue, backendUrl, conversationId]);
  
  // Función para cerrar Y RESETEAR (desde el botón X)
  const handleCloseAndReset = () => {
    setIsOpen(false);
    setMessages([]); 
    setConversationId(null); 
    console.log('[ChatWidget] Chat cerrado y reseteado.');
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !isLoading) {
      sendMessage();
    }
  };

  // --- Renderizado --- 
  return (
    <div className="chat-widget-container">
      {isOpen ? (
        <div className="chat-window">
          <div className="chat-header">
            <span>EcoAsistente</span>
            <div className="chat-header-buttons">
              {/* Botón Minimizar llama a handleToggleWindow */}
              <button onClick={handleToggleWindow} className="header-button minimize-button" title="Minimizar">
                <Minus size={18} />
              </button>
              {/* Botón Cerrar y Resetear llama a handleCloseAndReset */}
              <button onClick={handleCloseAndReset} className="header-button close-button" title="Cerrar y Reiniciar">
                <X size={18} />
              </button>
            </div>
          </div>
          <div className="chat-messages">
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.sender}`}>
                {/* Renderizar texto o tabla según el tipo */} 
                {msg.type === 'text' && msg.text}
                {msg.type === 'table' && msg.products && (
                  <ProductTable products={msg.products} />
                )}
              </div>
            ))}
            {isLoading && (
              <div className="message bot loading">
                <span>.</span><span>.</span><span>.</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="chat-input-area">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu mensaje..."
              disabled={isLoading}
            />
            <button onClick={sendMessage} disabled={isLoading || !inputValue.trim()} className="send-button">
              <Send />
            </button>
          </div>
        </div>
      ) : (
        // Renderiza la burbuja del chat solo si no está abierto el modal
        <button 
          className="chat-bubble" 
          onClick={onBubbleClick} 
          style={{ 
            backgroundColor: '#A0AEC0', 
            cursor: 'not-allowed', 
            position: 'relative', // Add position relative to contain the absolute line
            overflow: 'hidden' // Hide overflowing line parts if any
          }} 
        >
          {/* Horizontal line to indicate it's disabled */}
          <div style={{
            position: 'absolute',
            top: '50%', // Center vertically
            left: '50%', // Center horizontally
            width: '150%', // Make it wider to cover the circle diagonally
            height: '2px', // Line thickness
            backgroundColor: '#D1D5DB', // A lighter grey color (Tailwind gray-300)
            transform: 'translate(-50%, -50%) rotate(-45deg)', // Center and rotate in the reverse direction
            zIndex: 1, // Ensure line is above the icon
          }}></div>
          {/* Icon */}
          <div style={{ position: 'relative', zIndex: 2 }}> {/* Ensure icon is above the line */}
             {isLoading ? <Loader2 size={24} className="animate-spin" /> : <MessageSquare size={24} />} 
          </div>
        </button>
      )}
    </div>
  );
}); // <-- Cierre del forwardRef

export default ChatWidget; // <-- Exportar el componente envuelto 