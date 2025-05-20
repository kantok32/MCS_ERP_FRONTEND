export const api = {
  // ... otras funciones ...

  deleteProfile: async (profileId: string): Promise<{ message: string }> => {
    try {
      const response = await fetch(`/api/profiles/${profileId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Error al eliminar el perfil');
      }

      const result = await response.json();
      return result as { message: string };
    } catch (error) {
      console.error('Error en deleteProfile:', error);
      throw error; // También podrías devolver algo tipo { message: 'Error...' } si prefieres manejarlo suave
    }
  },


};