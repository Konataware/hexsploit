{
  pkgs ? import <nixpkgs> { },
}:

pkgs.mkShell {
  name = "hexploit-dev";

  packages = with pkgs; [
    nodejs_22
    git
  ];

  shellHook = ''
    echo "HEXploit development environment"
    echo "Node: $(node --version)"
    echo "npm:  $(npm --version)"
    echo "Execute ./start.sh"
  '';
}
