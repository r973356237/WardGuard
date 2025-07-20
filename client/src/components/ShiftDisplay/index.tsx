import React from 'react';
import { Card, Row, Col } from 'antd';
import { ShiftInfo } from '../../types/shift';
import { STYLE_CONFIG, UI_CONFIG } from '../../config/shiftConfig';

interface ShiftDisplayProps {
  shifts: ShiftInfo[];
  detailedColors: Record<string, string>;
}

/**
 * 班次显示组件
 * 显示当日所有队伍的排班情况
 */
export const ShiftDisplay: React.FC<ShiftDisplayProps> = ({ 
  shifts, 
  detailedColors 
}) => {
  return (
    <Card 
      title="当日排班情况" 
      size={UI_CONFIG.CARD.SIZE}
      style={{ marginTop: UI_CONFIG.CARD.MARGIN_TOP }}
    >
      <Row gutter={STYLE_CONFIG.LAYOUT.GUTTER}>
        {shifts.map(({ team, shift }) => {
          const isRest = shift === '休';
          const shiftColor = detailedColors[shift];
          
          return (
            <Col span={STYLE_CONFIG.LAYOUT.COL_SPAN} key={team}>
              <Card 
                size={UI_CONFIG.CARD.SIZE}
                className={`shift-card ${isRest ? 'rest-shift' : ''}`}
                style={{
                  borderLeft: `${STYLE_CONFIG.SHIFT_CARD.BORDER_WIDTH}px solid ${shiftColor}`,
                  backgroundColor: isRest 
                    ? STYLE_CONFIG.SHIFT_CARD.REST_BACKGROUND 
                    : `${shiftColor}${STYLE_CONFIG.SHIFT_CARD.BACKGROUND_OPACITY}`
                }}
              >
                <div className="team-name">{team}</div>
                <div 
                  className="shift-type" 
                  style={{ 
                    color: isRest 
                      ? STYLE_CONFIG.SHIFT_CARD.REST_COLOR 
                      : shiftColor 
                  }}
                >
                  {shift}
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>
    </Card>
  );
};