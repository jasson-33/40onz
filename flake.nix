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
      in {
        devShells.default = pkgs.mkShell {
          buildInputs = [
            pkgs.bun
            pkgs.nodejs_22
            pkgs.git
          ];

          shellHook = ''
            echo "🫙 40onz theme dev env loaded"
            echo "  bun  $(bun --version)"
            echo "  node $(node --version)"
          '';
        };
      });
}
