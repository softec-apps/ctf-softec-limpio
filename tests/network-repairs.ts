import type { DeviceId } from "../packages/network-contracts";
const SERVICE_NAME = "remesas.interno.example";
export const repairs: Record<string, [DeviceId, string[]][]> = {
  "network-01": [
    ["dns1", [`dns set ${SERVICE_NAME} 10.44.9.80`]],
    [
      "pc1",
      [`dig ${SERVICE_NAME}`, `curl http://${SERVICE_NAME}/entregas/actual`],
    ],
  ],
  "network-02": [
    ["sw1", ["enable", "configure terminal", "ip dhcp snooping", "end"]],
    ["pc1", ["dhcp discover"]],
  ],
  "network-03": [
    [
      "sw1",
      [
        "enable",
        "configure terminal",
        "interface ethernet1/4",
        "switchport access vlan 9",
        "end",
      ],
    ],
    ["pc1", ["ping 10.44.9.80"]],
  ],
  "network-04": [
    [
      "r1",
      [
        "enable",
        "configure terminal",
        "acl 10 permit tcp 10.44.8.0/24 10.44.9.80/32 80",
        "end",
      ],
    ],
    ["pc1", [`curl http://${SERVICE_NAME}/entregas/actual`]],
  ],
  "network-05": [
    ["files1", ["service http stop", "service https start", "tls minimum 1.2"]],
    ["pc1", [`curl https://${SERVICE_NAME}/entregas/actual`]],
  ],
  "network-06": [
    [
      "r1",
      ["enable", "configure terminal", "interface servers", "mtu 1500", "end"],
    ],
    ["pc1", ["ping 10.44.9.80 size 1400 df"]],
  ],
  "network-07": [
    ["files1", ["ftp passive on"]],
    ["pc1", [`ftp get ${SERVICE_NAME}/cierre.txt`]],
  ],
  "network-08": [
    [
      "r1",
      [
        "enable",
        "configure terminal",
        "ntp server 10.44.8.123",
        "end",
        "ntp sync",
      ],
    ],
  ],
  "network-09": [
    ["files1", [`tls name ${SERVICE_NAME}`, "tls minimum 1.2"]],
    ["pc1", [`curl https://${SERVICE_NAME}/entregas/actual`]],
  ],
  "network-10": [
    [
      "sw1",
      [
        "enable",
        "configure terminal",
        "interface ethernet1/4",
        "no shutdown",
        "end",
        "copy running-config startup-config",
        "reload",
      ],
    ],
    [
      "r1",
      [
        "enable",
        "configure terminal",
        "acl 10 permit tcp 10.44.8.0/24 10.44.9.80/32 80",
        "end",
        "copy running-config startup-config",
        "reload",
      ],
    ],
    [
      "dns1",
      [
        `dns set ${SERVICE_NAME} 10.44.9.80`,
        "copy running-config startup-config",
        "reload",
      ],
    ],
    ["pc1", [`curl http://${SERVICE_NAME}/entregas/actual`]],
  ],
};
