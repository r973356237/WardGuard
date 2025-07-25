import React, { useState, ReactNode } from 'react';
import { Form, Button } from 'antd';
import { DownOutlined, UpOutlined } from '@ant-design/icons';
import { FormInstance } from 'antd/es/form';
import './index.css';

interface CollapsibleFilterProps {
  form: FormInstance;
  onValuesChange: (changedValues: any, allValues: any) => void;
  onClear: () => void;
  maxVisibleItems?: number;
  children: ReactNode;
  extraActions?: ReactNode;
}

const CollapsibleFilter: React.FC<CollapsibleFilterProps> = ({
  form,
  onValuesChange,
  onClear,
  maxVisibleItems = 3,
  children,
  extraActions
}) => {
  const [expanded, setExpanded] = useState(false);

  const childrenArray = React.Children.toArray(children);
  const visibleItems = childrenArray.slice(0, maxVisibleItems);
  const hiddenItems = childrenArray.slice(maxVisibleItems);
  const hasHiddenItems = hiddenItems.length > 0;

  const handleToggle = () => {
    setExpanded(!expanded);
  };

  return (
    <div className="collapsible-filter">
      <Form
        form={form}
        onValuesChange={onValuesChange}
        className="filter-form"
      >
        <div className="filter-row">
          <div className={`filter-items ${expanded ? 'expanded' : ''}`}>
            {visibleItems}
          </div>
          <div className="filter-actions">
            {hasHiddenItems && (
              <Button
                type="link"
                icon={expanded ? <UpOutlined /> : <DownOutlined />}
                onClick={handleToggle}
                className="expand-button"
                style={{ marginRight: 8 }}
              >
                {expanded ? '收起' : '展开'}
              </Button>
            )}
            <Button 
              type="default" 
              onClick={onClear}
              style={{ marginRight: 8 }}
            >
              清空筛选条件
            </Button>
            {extraActions}
          </div>
        </div>
        
        {hasHiddenItems && expanded && (
          <div className="filter-collapse">
            <div className="filter-items expanded">
              {hiddenItems}
            </div>
          </div>
        )}
      </Form>
    </div>
  );
};

export default CollapsibleFilter;