export interface MercadoPagoCardFormInstance {
  getCardFormData: () => {
    token?: string;
    paymentMethodId?: string;
  };
}

export interface MercadoPagoInstance {
  cardForm: (options: {
    amount: string;
    iframe: boolean;
    form: Record<string, { id: string; placeholder?: string } | string>;
    callbacks: {
      onFormMounted?: (error: unknown) => void;
      onSubmit?: (event: Event) => void;
      onFetching?: (resource: string) => () => void;
    };
  }) => MercadoPagoCardFormInstance;
}

declare global {
  interface Window {
    MercadoPago?: new (
      publicKey: string,
      options?: { locale?: string },
    ) => MercadoPagoInstance;
  }
}

export {};
