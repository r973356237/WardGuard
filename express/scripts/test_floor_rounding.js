/**
 * 测试只舍不入（不满0.5年的舍去）的逻辑
 */

// 测试数据
const testValues = [
  0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0,
  1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0,
  2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 3.0
];

console.log('测试只舍不入（不满0.5年的舍去）的逻辑：');
console.log('原始值 -> 只舍不入后的值');
console.log('--------------------------');

testValues.forEach(value => {
  // 使用Math.floor实现只舍不入到0.5的倍数
  const floorRoundedValue = Math.floor(value * 2) / 2;
  
  // 格式化显示（整数不显示小数点）
  const formattedValue = floorRoundedValue.toFixed(floorRoundedValue % 1 === 0 ? 0 : 1);
  
  console.log(`${value.toFixed(1)} -> ${formattedValue}`);
});

console.log('\n对比四舍五入和只舍不入的区别：');
console.log('原始值 -> 四舍五入 -> 只舍不入');
console.log('--------------------------');

testValues.forEach(value => {
  // 四舍五入到0.5的倍数
  const roundedValue = Math.round(value * 2) / 2;
  // 只舍不入到0.5的倍数
  const floorRoundedValue = Math.floor(value * 2) / 2;
  
  // 格式化显示（整数不显示小数点）
  const formattedRoundedValue = roundedValue.toFixed(roundedValue % 1 === 0 ? 0 : 1);
  const formattedFloorRoundedValue = floorRoundedValue.toFixed(floorRoundedValue % 1 === 0 ? 0 : 1);
  
  console.log(`${value.toFixed(1)} -> ${formattedRoundedValue} -> ${formattedFloorRoundedValue}`);
});