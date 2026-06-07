FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /app

# Copy csproj, strip Windows CRLF line endings, and restore
COPY *.csproj ./
RUN sed -i 's/\r//' worker.csproj && dotnet restore worker.csproj

# Copy source and publish
COPY . ./
RUN dotnet publish worker.csproj -c Release -o out

# Use runtime image to run
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/out ./

ENTRYPOINT ["dotnet", "worker.dll"]
