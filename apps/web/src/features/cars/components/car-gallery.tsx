import Image from "next/image";
import type { CarDetail } from "@drivehub/contracts";

export function CarGallery({ images, alt }: { images: CarDetail["images"]; alt: string }) {
  const primary = images.find((image) => image.isPrimary) ?? images[0];

  if (!primary) {
    return (
      <div className="flex aspect-[16/9] w-full items-center justify-center rounded-xl bg-muted text-muted-foreground">
        No photos available yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-muted">
        <Image
          src={primary.url}
          alt={primary.altText ?? alt}
          fill
          className="object-cover"
          sizes="(min-width: 1024px) 60vw, 100vw"
          priority
        />
      </div>
      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {images.slice(0, 5).map((image) => (
            <div key={image.id} className="relative aspect-square overflow-hidden rounded-md bg-muted">
              <Image src={image.url} alt={image.altText ?? alt} fill className="object-cover" sizes="20vw" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
