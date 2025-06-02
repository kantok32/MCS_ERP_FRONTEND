import { Producto } from '../types/product'; // Corrected import path

export const fetchProductByCode = async (codigo: string): Promise<Producto | null> => {
  try {
    // Primero intentamos buscar por código
    const response = await fetch(`https://mcs-erp-backend-807184488368.southamerica-west1.run.app/api/products/detail?codigo=${encodeURIComponent(codigo)}`);

    if (!response.ok) {
      // Si no encontramos por código, intentamos buscar por nombre
      const searchResponse = await fetch(`https://mcs-erp-backend-807184488368.southamerica-west1.run.app/api/products/search?query=${encodeURIComponent(codigo)}`);
      
      if (!searchResponse.ok) {
        throw new Error(`No se pudo encontrar el producto con código ${codigo}`);
      }

      const searchData = await searchResponse.json();
      if (!searchData.success || !searchData.data?.products || searchData.data.products.length === 0) {
        throw new Error(`No se encontró ningún producto con el código o nombre ${codigo}`);
      }

      // Tomamos el primer resultado de la búsqueda
      const product = searchData.data.products[0];
      return {
        ...product,
        codigo_producto: product.codigo_producto || codigo,
        categoria: 'principal'
      };
    }

    const data = await response.json();
    if (!data.success || !data.data?.product) {
      throw new Error(`No se pudo obtener la información del producto ${codigo}`);
    }

    return {
      ...data.data.product,
      categoria: 'principal'
    };
  } catch (error: any) {
    console.error('Error en fetchProductByCode:', error);
    throw new Error(error.message || `Error al buscar el producto ${codigo}`);
  }
};

// You can add other product-related service functions here, for example:
// export const fetchAllProducts = async (): Promise<Producto[]> => { ... };
// export const updateProductDetails = async (productId: string, updates: Partial<Producto>): Promise<Producto> => { ... };

export const fetchAllProducts = async (): Promise<Producto[]> => {
  try {
    // Se asume que el cache se resetea en otro lugar si es necesario antes de llamar a esto,
    // o que este endpoint sirve datos suficientemente actualizados.
    // EquiposPanel.tsx hace un POST a /api/products/cache/reset antes.
    const response = await fetch('https://mcs-erp-backend-807184488368.southamerica-west1.run.app/api/products/cache/all');
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(errorData.message || `Error ${response.status} al obtener todos los productos.`);
    }
    const apiResponse = await response.json();
    if (!apiResponse.success || !apiResponse.data?.products?.data) {
      console.warn('[productService] fetchAllProducts: Estructura de respuesta inesperada o no exitosa.', apiResponse);
      throw new Error(apiResponse.message || 'Error en la respuesta del servidor al obtener todos los productos.');
    }
    return apiResponse.data.products.data as Producto[];
  } catch (error) {
    console.error('Error en fetchAllProducts:', error);
    throw error; // Re-lanzar el error para que el llamador lo maneje
  }
};

export const fetchFilteredProducts = async (searchTerm: string): Promise<Producto[]> => {
  if (!searchTerm.trim()) {
    return [];
  }
  // Backend's /api/products/filter expects 'codigo', 'modelo', or 'categoria'.
  // For a general search, we'll try with 'codigo'. 
  // A more advanced implementation might allow user to specify field or try multiple.
  const response = await fetch(`https://mcs-erp-backend-807184488368.southamerica-west1.run.app/api/products/filter?codigo=${encodeURIComponent(searchTerm)}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(errorData.message || `Error ${response.status} al buscar productos.`);
  }

  const data = await response.json();
  // The backend for /api/products/filter (fetchFilteredProductsController)
  // calls a utility fetchFilteredProducts(query) which likely returns an array directly.
  if (Array.isArray(data)) {
    return data as Producto[];
  } else if (data && Array.isArray(data.products)) { 
    return data.products as Producto[];
  } else if (data && Array.isArray(data.data)) { 
    return data.data as Producto[];
  }
  
  console.warn('[productService] fetchFilteredProducts: La respuesta no es un array de productos o estructura inesperada.', data);
  return []; 
};

export const searchProducts = async (query: string): Promise<Producto[]> => {
  try {
    console.log('Buscando productos con query:', query);
    
    // Primero intentamos buscar por código exacto
    const detailResponse = await fetch(`https://mcs-erp-backend-807184488368.southamerica-west1.run.app/api/products/detail?codigo=${encodeURIComponent(query)}`);
    
    if (detailResponse.ok) {
      const detailData = await detailResponse.json();
      if (detailData.success && detailData.data?.product) {
        console.log('Producto encontrado por código:', detailData.data.product);
        return [{
          ...detailData.data.product,
          categoria: 'principal'
        }];
      }
    }

    // Si no encontramos por código, buscamos por nombre
    const searchResponse = await fetch(`https://mcs-erp-backend-807184488368.southamerica-west1.run.app/api/products/search?query=${encodeURIComponent(query)}`);
    
    if (!searchResponse.ok) {
      throw new Error('Error al buscar productos');
    }

    const data = await searchResponse.json();
    console.log('Respuesta de búsqueda:', data);

    if (!data.success || !data.data?.products) {
      return [];
    }

    // Filtramos y mapeamos los resultados
    const productos = data.data.products
      .filter((product: Producto) => 
        product.codigo_producto && 
        product.nombre_del_producto && 
        product.Modelo
      )
      .map((product: Producto) => ({
        ...product,
        categoria: 'principal'
      }));

    console.log('Productos filtrados:', productos);
    return productos;
  } catch (error) {
    console.error('Error en searchProducts:', error);
    throw error;
  }
}; 