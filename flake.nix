{
  description = "40onz Shopify theme dev environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        vectorcraftCli =
          let
            archiveName =
              if pkgs.stdenv.hostPlatform.isDarwin then "vectorcraft-cli-0.13.1-macos-universal.zip"
              else if pkgs.stdenv.hostPlatform.isLinux && pkgs.stdenv.hostPlatform.isAarch64 then "vectorcraft-0.13.1-linux-aarch64.tar.gz"
              else "vectorcraft-0.13.1-linux-x86_64.tar.gz";
            archiveUrl = "https://github.com/storytold/vectorcraft/releases/download/v0.13.1/${archiveName}";
            archiveSha256 =
              if pkgs.stdenv.hostPlatform.isDarwin then "fc2c1f0163a7de37904556ee1c56d726d9ee738accd3c9dfc2f913d6ae2459fc"
              else if pkgs.stdenv.hostPlatform.isLinux && pkgs.stdenv.hostPlatform.isAarch64 then "8ae76af63ba8fa0c56a824bcd56fc757148a84758b2d42799dbca721fbc0fd68"
              else "35c0fcf6d3f9ebff6f33d257ff70eef414296f37f0d81f284e6f970e20fdb2c8";
          in
          pkgs.stdenvNoCC.mkDerivation {
            pname = "vectorcraft-cli";
            version = "0.13.1";
            src = pkgs.fetchurl {
              url = archiveUrl;
              sha256 = archiveSha256;
            };
            nativeBuildInputs = [ pkgs.unzip pkgs.gnutar ];
            dontConfigure = true;
            dontBuild = true;
            installPhase = ''
              runHook preInstall

              mkdir -p "$out/bin"
              workdir="$(mktemp -d)"

              case "$src" in
                *.zip)
                  unzip -q "$src" -d "$workdir"
                  ;;
                *.tar.gz)
                  tar -xzf "$src" -C "$workdir"
                  ;;
              esac

              cli_path="$(find "$workdir" -type f -name 'vectorcraft-cli' | head -n 1)"
              if [ -z "$cli_path" ]; then
                echo "Could not find vectorcraft-cli binary in archive" >&2
                find "$workdir" -maxdepth 3 -type f >&2
                exit 1
              fi

              install -m755 "$cli_path" "$out/bin/vectorcraft-cli"
              runHook postInstall
            '';
          };
      in {
        packages.vectorcraft-cli = vectorcraftCli;

        devShells.default = pkgs.mkShell {
          buildInputs = [
            pkgs.bun
            pkgs.nodejs_22
            pkgs.git
            pkgs.python312
            pkgs.python312Packages.pymupdf
            pkgs.python312Packages.pillow
            pkgs.playwright-driver.browsers
            pkgs.inkscape
            vectorcraftCli
          ];

          shellHook = ''
            echo "🫙 40onz theme dev env loaded"
            echo "  bun    $(bun --version)"
            echo "  node   $(node --version)"
            echo "  python $(python3 --version)"
          '';
        };
      });
}
