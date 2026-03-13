export const DEFAULT_REGISTERS = [
  { name: 'r0', value: '0x0000' },
  { name: 'r1', value: '0x0000' },
  { name: 'r2', value: '0x0000' },
  { name: 'r3', value: '0x0000' },
  { name: 'r4', value: '0x0000' },
  { name: 'r5', value: '0x0000' },
  { name: 'r6', value: '0x4000' },
  { name: 'r7', value: '0x0000' }
];

export const DEFAULT_FLAGS = { N: 0, Z: 0, P: 0, C: 0, V: 0 };

export const DEFAULT_STACK = [
  { addr: '0x4000', value: '0x0000' },
  { addr: '0x3fff', value: '0x0000' },
  { addr: '0x3ffe', value: '0x0000' }
];