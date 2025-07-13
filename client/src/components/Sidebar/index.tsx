import React from 'react';
import { Menu } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  UserOutlined,
  TeamOutlined,
  MedicineBoxOutlined,
  FileTextOutlined,
  SettingOutlined,
  ShoppingOutlined
} from '@ant-design/icons';

const Sidebar: React.FC = () => {
  const location = useLocation();

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: <Link to="/">仪表盘</Link>,
    },
    {
      key: '/users',
      icon: <UserOutlined />,
      label: <Link to="/users">用户管理</Link>,
    },
    {
      key: '/employees',
      icon: <TeamOutlined />,
      label: <Link to="/employees">员工管理</Link>,
    },
    {
      key: '/medicines',
      icon: <MedicineBoxOutlined />,
      label: <Link to="/medicines">药品管理</Link>,
    },
    {
      key: '/supplies',
      icon: <ShoppingOutlined />,
      label: <Link to="/supplies">物资管理</Link>,
    },
    {
      key: '/medical-examinations',
      icon: <FileTextOutlined />,
      label: <Link to="/medical-examinations">体检记录</Link>,
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: <Link to="/settings">系统设置</Link>,
    },
  ];

  return (
    <Menu
      selectedKeys={[location.pathname]}
      mode="inline"
      theme="dark"
      items={menuItems}
      style={{ height: '100%', borderRight: 0 }}
    />
  );
};

export default Sidebar;