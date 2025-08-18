# Time Synchronization

All servers must maintain accurate system time to avoid authentication and scheduling issues.

- Set the system timezone to **UTC**.
- Ensure NTP synchronization is enabled (e.g., `timedatectl set-ntp true`).
- Run the provisioning script `../setup-time-sync.sh` on new hosts.
- Verify status with `timedatectl status` or `date`.

Keeping time in sync prevents token expiry problems and misaligned schedules.
