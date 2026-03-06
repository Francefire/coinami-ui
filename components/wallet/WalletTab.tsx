import BalanceCard from "./BalanceCard";
import SendForm from "./SendForm";

export default function WalletTab() {
  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Wallet</h2>
        <p className="text-sm text-muted-foreground">
          Manage your balance and send funds.
        </p>
      </div>
      <BalanceCard />
      <SendForm />
    </div>
  );
}
