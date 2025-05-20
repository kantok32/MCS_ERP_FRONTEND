export interface CurrencyValue {
  value: string;
  fecha: string;
  last_update: string;
}

export interface CurrencyData {
  currencies?: {
    dollar?: {
      value?: string | number;
      last_update?: string;
    };
    euro?: {
      value?: string | number;
      last_update?: string;
    };
  };
  message?: string;
}