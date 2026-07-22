import Image from "next/image";

export default function BrandLockup() {
  return (
    <span className="brand-lockup" aria-label="Carmelita">
      <Image
        className="brand-mark"
        src="/brand/carmelita-mark.svg"
        alt=""
        aria-hidden="true"
        width={32}
        height={32}
      />
      <span className="brand-wordmark" aria-hidden="true">
        Carmelita
      </span>
    </span>
  );
}
