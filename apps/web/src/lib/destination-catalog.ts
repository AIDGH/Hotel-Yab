import { getDestinations } from "@/lib/api";

export type CatalogDestination = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string;
  description: string;
  parentProvinceSlug: string;
  isFeatured: boolean;
  displayOrder: number | null;
};

export async function getDestinationCatalog(): Promise<{
  provinces: CatalogDestination[];
  cities: CatalogDestination[];
}> {
  const result = await getDestinations();
  if (!result.ok) return { provinces: [], cities: [] };
  const destinations = result.value.data;

  function normalize(destination: (typeof destinations)[number]) {
    return {
    id: destination.id,
    name: destination.name,
    slug: destination.slug,
    imageUrl: destination.imageUrl ?? "",
    description: destination.description ?? "",
    parentProvinceSlug: destination.parentProvince?.slug ?? "",
    isFeatured: destination.isFeatured,
    displayOrder: destination.displayOrder,
    };
  }

  return {
    provinces: destinations
      .filter((destination) => destination.type === "PROVINCE")
      .map(normalize),
    cities: destinations
      .filter((destination) => destination.type === "CITY")
      .map(normalize),
  };
}
