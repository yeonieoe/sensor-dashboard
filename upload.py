import os
import sys
import time
from pathlib import Path

from dotenv import load_dotenv
from serial import Serial
from serial.tools import list_ports
from supabase import create_client


def load_supabase_config() -> tuple[str, str]:
    env_path = Path(__file__).resolve().parent / ".env"
    load_dotenv(dotenv_path=env_path)

    url = os.getenv("VITE_SUPABASE_URL")
    key = os.getenv("VITE_SUPABASE_ANON_KEY")

    if not url or not key:
        raise RuntimeError(
            "Missing .env values: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY"
        )

    return url, key


def find_serial_port() -> str:
    matches = [
        port.device
        for port in list_ports.comports()
        if port.device and port.device.startswith("/dev/cu.usbmodem")
    ]

    if not matches:
        raise RuntimeError(
            "No serial port found matching /dev/cu.usbmodem*. "
            "Please connect the Arduino and retry."
        )

    return matches[0]


def parse_value(raw_line: str):
    value = raw_line.strip()
    if not value:
        return None

    try:
        return float(value)
    except ValueError:
        return None


def insert_reading(client, value: float):
    response = client.table("readings").insert({"value": value}).execute()
    return response


def main() -> None:
    try:
        url, key = load_supabase_config()
        client = create_client(url, key)
        port_name = find_serial_port()

        print(f"Connected to Supabase and serial port: {port_name}")

        with Serial(port_name, baudrate=9600, timeout=1) as ser:
            while True:
                raw_line = ser.readline()
                if not raw_line:
                    continue

                value = parse_value(raw_line.decode("utf-8", errors="replace"))
                if value is None:
                    continue

                try:
                    response = insert_reading(client, value)
                    print(f"Inserted {value}: {response}")
                except Exception as exc:
                    print(f"Failed to insert {value}: {exc}", file=sys.stderr)
                    time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopped by user.")
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
