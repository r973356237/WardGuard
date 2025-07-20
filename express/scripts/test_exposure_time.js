const http = require('http');

// 创建HTTP请求函数
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve(parsedData);
        } catch (e) {
          reject(new Error(`解析响应失败: ${e.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testAddEmployee() {
  try {
    // 创建一个测试员工数据，包含参加工作时间和入职前接害时间
    const testEmployee = {
      name: '测试员工',
      employee_number: 'TEST001',
      gender: '男',
      workshop: '测试车间',
      position: '测试岗位',
      birth_date: '1990-01-01',
      hire_date: '2020-01-01',
      work_start_date: '2010-01-01', // 参加工作时间为2010年1月1日
      original_company: '测试公司',
      pre_hire_exposure_time: 5, // 入职前接害时间为5年
      id_number: '123456789012345678'
    };

    console.log('添加测试员工...');
    const addResponse = await makeRequest('POST', '/api/employees', testEmployee);
    console.log('添加员工响应:', JSON.stringify(addResponse, null, 2));
    
    // 获取添加的员工ID
    const employeeId = addResponse.data.id;
    
    // 查询添加的员工信息
    console.log('\n查询添加的员工信息...');
    const getResponse = await makeRequest('GET', `/api/employees`);
    // 查找刚添加的员工
    const addedEmployee = getResponse.data.find(emp => emp.employee_number === 'TEST001');
    console.log('员工信息:', JSON.stringify(addedEmployee, null, 2));
    
    // 更新员工信息，修改参加工作时间和入职前接害时间
    const updatedEmployee = {
      ...testEmployee,
      work_start_date: '2015-01-01', // 修改参加工作时间为2015年1月1日
      pre_hire_exposure_time: 3 // 修改入职前接害时间为3年
    };
    
    console.log('\n更新员工信息...');
    const updateResponse = await makeRequest('PUT', `/api/employees/${employeeId}`, updatedEmployee);
    console.log('更新员工响应:', JSON.stringify(updateResponse, null, 2));
    
    // 再次查询员工信息，验证总接害时间是否更新
    console.log('\n查询更新后的员工信息...');
    const getUpdatedResponse = await makeRequest('GET', `/api/employees`);
    // 查找更新后的员工
    const updatedEmployeeData = getUpdatedResponse.data.find(emp => emp.employee_number === 'TEST001');
    console.log('更新后的员工信息:', JSON.stringify(updatedEmployeeData, null, 2));
    
    // 清理测试数据
    console.log('\n清理测试数据...');
    const deleteResponse = await makeRequest('DELETE', `/api/employees/${employeeId}`);
    console.log('删除员工响应:', JSON.stringify(deleteResponse, null, 2));
    
  } catch (error) {
    console.error('测试失败:', error.message);
  }
}

testAddEmployee();