import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Logo } from "@/components/brand/Logo";
import { Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: Ruta no encontrada:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="flex justify-center">
          <Logo className="h-12 w-auto" />
        </div>

        <Card className="border-none shadow-xl">
          <CardHeader className="space-y-2 pb-2">
            <h1 className="text-6xl font-black text-primary/20">404</h1>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Página no encontrada
            </h2>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Lo sentimos, no hemos podido encontrar la página que buscas:
              <br />
              <code className="mt-2 inline-block rounded bg-muted px-2 py-1 text-sm font-mono text-muted-foreground">
                {location.pathname}
              </code>
            </p>
          </CardContent>
          <CardFooter className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild variant="default" size="lg" className="w-full sm:w-auto gap-2">
              <Link to="/dashboard">
                <Home className="h-4 w-4" />
                Ir al Inicio
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto gap-2">
              <Link to="/login">
                <ArrowLeft className="h-4 w-4" />
                Volver a entrar
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <p className="text-sm text-muted-foreground">
          ¿Crees que esto es un error?{" "}
          <Link to="/help" className="font-medium text-primary hover:underline">
            Contacta con soporte
          </Link>
        </p>
      </div>
    </div>
  );
};

export default NotFound;
