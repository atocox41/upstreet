export const dragStartType = type => (e, item) => {
  const npcFile = JSON.stringify(item, null, 2);
//   console.log('drop file', `application/${type}`, npcFile);
  e.dataTransfer.setData(`application/${type}`, npcFile);
};