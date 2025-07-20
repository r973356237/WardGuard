import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { getDaysInMonth, isSameDay } from 'date-fns';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

const TeamPreviewScreen = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState('一队');
  const flatListRef = useRef(null);
  const ITEM_HEIGHT = 70;
  const HIGHLIGHT_RADIUS = 6;

  // 获取当月所有日期
  const getMonthDates = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(currentDate);
    return Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1));
  };

  // 格式化日期显示
  const formatDate = (date) => {
    const day = date.getDate();
    const weekDay = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()];
    return `${day} ${weekDay}`;
  };

  // 计算排班逻辑
  const calculateShift = (date) => {
    const baseDate = new Date(2025, 6, 15);
    const timeDiff = date - baseDate;
    const dayDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const cycleDay = (dayDiff % 4 + 4) % 4;

    const shifts = [
      { '一队': '休', '二队': '早班', '三队': '白班', '四队': '夜班' },
      { '一队': '白班', '二队': '休', '三队': '夜班', '四队': '早班' },
      { '一队': '夜班', '二队': '白班', '三队': '早班', '四队': '休' },
      { '一队': '早班', '二队': '夜班', '三队': '休', '四队': '白班' }
    ];

    return shifts[cycleDay];
  };

  // 获取班次样式
  const getShiftStyle = (team, shift) => {
    const baseStyle = {
      width: '90%',
      textAlign: 'center',
      fontSize: 16,
      paddingVertical: 4,
      borderRadius: HIGHLIGHT_RADIUS
    };

    let colorStyle = {};
    switch (shift) {
      case '休': colorStyle = { color: '#888' }; break;
      case '早班': colorStyle = { color: '#4CAF50' }; break;
      case '白班': colorStyle = { color: '#2196F3' }; break;
      case '夜班': colorStyle = { color: '#FF9800' }; break;
      default: colorStyle = { color: '#333' };
    }

    if (team === selectedTeam) {
      return {
        ...baseStyle,
        ...colorStyle,
        backgroundColor: '#1E90FF',
        color: 'white',
        fontWeight: 'bold'
      };
    }

    return { ...baseStyle, ...colorStyle };
  };

  // 渲染单个日期项
  const renderDateItem = ({ item }) => {
    const isSelected = isSameDay(item, selectedDate);
    const shifts = calculateShift(item);

    return (
      <TouchableOpacity
        style={[styles.listItemContainer, isSelected && styles.selectedListItem]}
        onPress={() => setSelectedDate(item)}
      >
        <View style={styles.dateColumn}>
          <Text style={styles.dateText}>{formatDate(item)}</Text>
        </View>

        <View style={styles.teamsColumnContainer}>
          <View style={styles.teamColumn}>
            <Text style={getShiftStyle('一队', shifts['一队'])}>{shifts['一队']}</Text>
          </View>
          <View style={styles.teamColumn}>
            <Text style={getShiftStyle('二队', shifts['二队'])}>{shifts['二队']}</Text>
          </View>
          <View style={styles.teamColumn}>
            <Text style={getShiftStyle('三队', shifts['三队'])}>{shifts['三队']}</Text>
          </View>
          <View style={styles.teamColumn}>
            <Text style={getShiftStyle('四队', shifts['四队'])}>{shifts['四队']}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // 渲染队伍表头
  const renderTeamHeader = (teamName) => {
    const isSelected = teamName === selectedTeam;
    return (
      <View style={styles.teamColumn}>
        <TouchableOpacity
          style={[
            styles.teamHeaderContainer,
            isSelected && {
              ...styles.selectedTeamHeader,
              borderRadius: HIGHLIGHT_RADIUS
            }
          ]}
          onPress={() => setSelectedTeam(teamName)}
        >
          <Text style={[styles.teamHeaderText, isSelected && styles.selectedTeamHeaderText]}>
            {teamName}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // 滚动到选中日期
  const scrollToSelectedDate = (date) => {
    if (!flatListRef.current) return;
    const index = date.getDate() - 1;
    const daysInMonth = getDaysInMonth(currentDate);
    if (index < 0 || index >= daysInMonth) return;

    flatListRef.current.scrollToIndex({
      index,
      animated: true,
      viewPosition: 0.5
    });
  };

  // 处理滚动失败
  const handleScrollToIndexFailed = (info) => {
    console.warn(`滚动失败: 索引 ${info.index} 无效`);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  // 组件加载时滚动到当日日期
  useEffect(() => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
    // 确保FlatList已渲染
    setTimeout(() => {
      scrollToSelectedDate(today);
    }, 0);
  }, []);

  return (
    <View style={styles.container}>
      {/* 头部导航 */}
      <View style={styles.header}>
        <Text style={styles.title}>班表总览</Text>
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={() => {
            const newDate = new Date(currentDate);
            newDate.setMonth(newDate.getMonth() - 1);
            setCurrentDate(newDate);
          }}>
            <Text style={styles.navText}>◀</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setDatePickerVisibility(true)}>
            <Text style={styles.monthText}>
              {currentDate.getFullYear()}年{currentDate.getMonth() + 1}月
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => {
            const newDate = new Date(currentDate);
            newDate.setMonth(newDate.getMonth() + 1);
            setCurrentDate(newDate);
          }}>
            <Text style={styles.navText}>▶</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity 
          style={styles.todayButton} 
          onPress={() => {
            const today = new Date();
            setCurrentDate(today);
            setSelectedDate(today);
            scrollToSelectedDate(today);
          }}
        >
          <Text style={styles.todayText}>当日</Text>
        </TouchableOpacity>
      </View>

      {/* 表头 */}
      <View style={styles.headerContainer}>
        <View style={styles.dateColumn}>
          <Text style={styles.headerDateText}>日期</Text>
        </View>
        <View style={styles.teamsColumnContainer}>
          {renderTeamHeader('一队')}
          {renderTeamHeader('二队')}
          {renderTeamHeader('三队')}
          {renderTeamHeader('四队')}
        </View>
      </View>

      {/* 列表 */}
      <FlatList
        ref={flatListRef}
        data={getMonthDates()}
        renderItem={renderDateItem}
        keyExtractor={(item) => item.toISOString()}
        showsVerticalScrollIndicator={false}
        getItemLayout={getItemLayout}
        onScrollToIndexFailed={handleScrollToIndexFailed}
      />

      {/* 日期选择器 */}
      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        display="spinner"
        onConfirm={(date) => {
          const newDate = new Date(date);
          setCurrentDate(newDate);
          setSelectedDate(newDate);
          setDatePickerVisibility(false);
        }}
        onCancel={() => setDatePickerVisibility(false)}
      />
    </View>
  );
};

// 样式表
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  // 头部导航
  header: {
    backgroundColor: '#1E90FF',
    padding: 16,
    paddingTop: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  title: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  monthNav: { flexDirection: 'row', alignItems: 'center' },
  navText: { color: 'white', fontSize: 18 },
  monthText: { color: 'white', fontSize: 16, marginHorizontal: 8 },
  todayButton: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4
  },
  todayText: { color: 'white', fontSize: 14 },

  // 表头容器
  headerContainer: {
    flexDirection: 'row',
    paddingVertical: 12,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },

  // 日期列
  dateColumn: {
    width: '28%',
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerDateText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center'
  },

  // 队伍列容器
  teamsColumnContainer: {
    width: '72%',
    flexDirection: 'row',
  },

  // 单个队伍列
  teamColumn: {
    width: '25%',
    alignItems: 'center',
    justifyContent: 'center'
  },

  // 表头队伍项样式
  teamHeaderContainer: {
    width: '90%',
    paddingVertical: 4,
    alignItems: 'center'
  },
  teamHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center'
  },
  selectedTeamHeader: {
    backgroundColor: '#1E90FF',
    width: '90%',
    paddingVertical: 4
  },
  selectedTeamHeaderText: {
    color: 'white'
  },

  // 列表项容器
  listItemContainer: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    height: 70
  },
  selectedListItem: {
    backgroundColor: '#e6f7ff',
    borderLeftWidth: 3,
    borderLeftColor: '#1E90FF'
  },

  // 列表项日期文字
  dateText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center'
  }
});

// 列表项布局计算
const getItemLayout = (data, index) => ({
  length: 70,
  offset: 70 * index,
  index
});

export default TeamPreviewScreen;