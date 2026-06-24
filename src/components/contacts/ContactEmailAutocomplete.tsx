import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";

export interface ContactSuggestion {
  id: string;
  name: string | null;
  email: string;
  phone?: string | null;
  nif?: string | null;
  address?: string | null;
}

interface ContactEmailAutocompleteProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (contact: ContactSuggestion) => void;
  placeholder?: string;
}

// QW-05: autocomplete inline sobre el campo de email del firmante. La agenda
// del autónomo es pequeña, así que se carga una vez y se filtra en local (sin
// pegarle a Supabase en cada tecla). Al elegir un contacto, el padre rellena
// nombre, email, teléfono, NIF y dirección.
export function ContactEmailAutocomplete({
  id,
  value,
  onChange,
  onSelect,
  placeholder,
}: ContactEmailAutocompleteProps) {
  const [contacts, setContacts] = useState<ContactSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("contacts")
        .select("id,name,email,phone,nif,address")
        .order("name");
      if (active && data) setContacts(data as ContactSuggestion[]);
    })();
    return () => {
      active = false;
    };
  }, []);

  // Cerrar la lista al hacer click fuera del componente.
  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  const q = value.trim().toLowerCase();
  const matches =
    q.length === 0
      ? []
      : contacts
          .filter(
            (c) =>
              c.email.toLowerCase().includes(q) ||
              (c.name ?? "").toLowerCase().includes(q)
          )
          .slice(0, 6);

  // No mostramos la lista si el único match es exactamente lo ya escrito.
  const showList =
    open &&
    matches.length > 0 &&
    !(matches.length === 1 && matches[0].email.toLowerCase() === q);

  const choose = (contact: ContactSuggestion) => {
    onSelect(contact);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      <Input
        id={id}
        type="email"
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        data-clarity-mask="True"
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!showList) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => Math.min(h + 1, matches.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            choose(matches[highlight]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {showList && (
        <ul className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-popover py-1 shadow-md">
          {matches.map((c, i) => (
            <li key={c.id}>
              <button
                type="button"
                onMouseEnter={() => setHighlight(i)}
                onClick={() => choose(c)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                  i === highlight ? "bg-accent" : ""
                }`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                  {(c.name ?? "NN").substring(0, 2).toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {c.name || "Sin nombre"}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {c.email}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
