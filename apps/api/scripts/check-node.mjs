const requiredMajor = 22;
const requiredMinor = 23;
const [major, minor] = process.versions.node.split('.').map(Number);

if (
  major < requiredMajor ||
  (major === requiredMajor && minor < requiredMinor)
) {
  console.error(
    `Node ${process.versions.node} is not supported. This API requires Node >=${requiredMajor}.${requiredMinor}.0.`,
  );
  console.error('From the repository root run: nvm use');
  process.exit(1);
}
