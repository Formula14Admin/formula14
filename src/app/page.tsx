import Image from "next/image";

export default function Home() {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center"
      style={{ backgroundColor: "#1a1a1a" }}
    >
      <Image
        src="/Logo.png"
        alt="Formula14"
        width={320}
        height={320}
        priority
        className="object-contain"
      />
      <p
        className="mt-8 text-2xl font-light tracking-widest uppercase"
        style={{ color: "#ffffff" }}
      >
        Coming Soon
      </p>
    </main>
  );
}
