import { useSpace } from "@/lib/space-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function SpaceSwitcher() {
  const { spaces, activeSpace, switchSpace } = useSpace();

  // Single space — no dropdown needed
  if (spaces.length <= 1) {
    return <span className="text-lg font-semibold px-2">MPS</span>;
  }

  return (
    <Select value={activeSpace?.id ?? ""} onValueChange={switchSpace}>
      <SelectTrigger className="w-full border-none shadow-none font-semibold text-base px-2">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {spaces.map((space) => (
          <SelectItem key={space.id} value={space.id}>
            <div className="flex items-center gap-2">
              {space.image ? (
                <img src={space.image} alt="" className="size-5 rounded-full" referrerPolicy="no-referrer" />
              ) : (
                <div className="size-5 rounded-full bg-muted" />
              )}
              <span>{space.isOwner ? "My Space" : `${space.name}'s Space`}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
