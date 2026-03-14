async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/stream?id=20&ep=1&type=dub');
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(e);
  }
}
test();
