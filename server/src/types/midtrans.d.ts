declare module "midtrans-client" {
  interface MidtransClientOptions {
    isProduction: boolean;
    serverKey: string;
    clientKey: string;
  }

  interface TransactionDetails {
    order_id: string;
    gross_amount: number;
  }

  interface SnapTransactionParameters {
    transaction_details: TransactionDetails;
  }

  interface SnapTransactionResponse {
    token: string;
    redirect_url: string;
  }

  interface MidtransNotification {
    order_id: string;
    status_code: string;
    gross_amount: string;
    transaction_status: string;
    fraud_status?: string;
    payment_type?: string;
    transaction_id?: string;
    transaction_time?: string;
    settlement_time?: string;
    signature_key?: string;
  }

  interface Snap {
    createTransaction(
      parameter: SnapTransactionParameters
    ): Promise<SnapTransactionResponse>;

    transaction: {
      notification(
        notificationJson: MidtransNotification
      ): Promise<MidtransNotification>;
    };
  }

  const midtransClient: {
    Snap: new (options: MidtransClientOptions) => Snap;
  };

  export default midtransClient;
}