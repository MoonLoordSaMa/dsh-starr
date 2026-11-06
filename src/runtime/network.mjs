import net from "node:net";

const nonPublicIPv4 = new net.BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
])
  nonPublicIPv4.addSubnet(network, prefix, "ipv4");

const globalIPv6 = new net.BlockList();
globalIPv6.addSubnet("2000::", 3, "ipv6");

const nonPublicIPv6 = new net.BlockList();
for (const [network, prefix] of [
  ["2001::", 23],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["3fff::", 20],
])
  nonPublicIPv6.addSubnet(network, prefix, "ipv6");

export function isPublicAddress(address) {
  const family = net.isIP(address);
  if (family === 4) return !nonPublicIPv4.check(address, "ipv4");
  if (family !== 6) return false;
  return (
    globalIPv6.check(address, "ipv6") && !nonPublicIPv6.check(address, "ipv6")
  );
}

export function hasOnlyPublicAddresses(addresses) {
  return (
    addresses.length > 0 &&
    addresses.every(({ address }) => isPublicAddress(address))
  );
}
