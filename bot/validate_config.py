import json
import os
import sys

def validate_config(validation_file="validation.json"):
    """Valida que todas las variables de entorno y archivos requeridos existan."""
    print("=" * 50)
    print("🔍 INICIANDO VALIDACIÓN DE CONFIGURACIÓN")
    print("=" * 50)
    
    with open(validation_file, 'r') as f:
        config = json.load(f)
    
    all_valid = True
    
    # Validar variables de entorno
    print("\n✓ Validando variables de entorno...")
    for var in config["required_env_vars"]:
        if os.getenv(var):
            print(f"  ✅ {var}: OK")
        else:
            print(f"  ❌ {var}: NO ENCONTRADO")
            all_valid = False
    
    # Validar archivos
    print("\n✓ Validando archivos requeridos...")
    for file in config["required_files"]:
        if os.path.exists(file):
            print(f"  ✅ {file}: OK")
        else:
            print(f"  ❌ {file}: NO ENCONTRADO")
            all_valid = False
    
    # Validar archivo de credenciales de Firebase
    service_account_file = os.getenv("SERVICE_ACCOUNT_FILE")
    if service_account_file:
        print("\n✓ Validando archivo de credenciales...")
        if os.path.exists(service_account_file):
            print(f"  ✅ Credenciales encontradas: {service_account_file}")
        else:
            print(f"  ❌ Credenciales no encontradas: {service_account_file}")
            all_valid = False
    
    print("\n" + "=" * 50)
    if all_valid:
        print("✅ VALIDACIÓN EXITOSA - Iniciando aplicación...")
        print("=" * 50 + "\n")
        return True
    else:
        print("❌ VALIDACIÓN FALLIDA - Revisa la configuración")
        print("=" * 50)
        sys.exit(1)

if __name__ == "__main__":
    validate_config()
