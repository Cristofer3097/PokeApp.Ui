var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.UseDefaultFiles(); // Permite que busque index.html por defecto
app.UseStaticFiles();  // Habilita el uso de archivos en la carpeta wwwroot

app.Run();
