import { useState } from 'react';
import { z } from 'zod';
import { format, getDate, startOfDay, differenceInMinutes } from 'date-fns';
import { Frequency } from '@/app/(content-layout)/[groupId]/tasklist/_tasklist/types/task-type';
import generateTime from './time-table';
import { TaskItemProps, TaskItem, Time } from './type';
import useZodForm from '@/hooks/useZodForm';
import axiosClient from '@/lib/axiosClient';
import { useModal } from '@/contexts/ModalContext';
import { Toast } from '../common/Toastify';
import { revalidateTasks } from '@/app/(content-layout)/[groupId]/tasklist/_tasklist/actions/task-actions';

const REVERSE_FREQUENCY_MAP: Record<string, Frequency> = {
  '한 번': 'ONCE',
  매일: 'DAILY',
  '주 반복': 'WEEKLY',
  '월 반복': 'MONTHLY',
};

export default function useManageTaskItem({
  detailTask,
  groupId,
  taskListId,
  isDone,
  createOrEditModalId,
}: TaskItemProps) {
  const { am, pm } = generateTime();
  const { closeModal } = useModal();
  const task = detailTask?.recurring;

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  // const [taskItem, setTaskItem] = useState<TaskItem>(() => ({
  //   name: detailTask?.name ?? '',
  //   description: detailTask?.description ?? '',
  //   startDate: task?.startDate ?? startOfDay(new Date()),
  //   frequencyType: task?.frequencyType ?? 'ONCE',
  // }));
  const [isTimeOpen, setIsTimeOpen] = useState(false);
  const [selectedFrequency, setSelectedFrequency] = useState('');
  const [weekDays, setWeekDays] = useState<number[]>([]);

  const taskSchema = z.object({
    name: z.string().min(1),
    description: z.string().min(1),
    startDate: z.instanceof(Date),
    frequencyType: z.enum(['ONCE', 'DAILY', 'WEEKLY', 'MONTHLY']),
  });

  const defaultValues = {
    name: detailTask?.name ?? '',
    description: detailTask?.description ?? '',
    startDate: task?.startDate ?? startOfDay(new Date()),
    frequencyType: task?.frequencyType ?? 'ONCE',
  };

  const form = useZodForm({
    validationSchema: taskSchema,
    defaultValues,
  });

  const { handleSubmit, setValue, watch } = form;
  const currentValue = watch();

  const getNearestTime = (date: Date): Time => {
    const hours = date.getHours();
    const isAM = hours < 12;
    const period = isAM ? '오전' : '오후';
    const list = isAM ? am : pm;

    const formattedTime = list.map((time) => {
      const [h, m] = time.split(':').map(Number);
      const candidate = new Date(date).setHours(h, m);

      return {
        time,
        diff: Math.abs(differenceInMinutes(candidate, date)),
      };
    });

    const nearest = formattedTime.reduce((prev, curr) => (curr.diff < prev.diff ? curr : prev));

    return { period, time: nearest.time };
  };

  const initialSelectedTime = (): Time => {
    const date = task?.startDate ? new Date(task.startDate) : new Date();
    return getNearestTime(date);
  };

  const [selectedTime, setSelectedTime] = useState<Time>(initialSelectedTime);

  const [_, setIsFrequencyDelete] = useState(false);

  const { period, time } = selectedTime;

  const select = [
    {
      id: 'date',
      value: format(currentValue.startDate, 'yyyy년 MM월 dd일'),
      onClick: task
        ? undefined
        : () => {
            setIsCalendarOpen((prev) => !prev);
            setIsTimeOpen(false);
          },
      isOpen: isCalendarOpen,
      flex: 'flex-[1.65]',
    },
    {
      id: 'time',
      value: `${period} ${time}`,
      onClick: task
        ? undefined
        : () => {
            setIsTimeOpen((prev) => !prev);
            setIsCalendarOpen(false);
          },
      isOpen: isTimeOpen,
      flex: 'flex-[1]',
    },
  ];

  const createStartDate = (date: Date | string, time: string) => {
    const dateObj = new Date(date);

    const [hourStr, minuteStr] = time.split(':');
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);

    return new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), hour, minute, 0);
  };

  const updateStartDate = (date: Date) => {
    setValue('startDate', date);
  };

  const handleCalendarDateChange = (selectedDate: Date) => {
    updateStartDate(createStartDate(selectedDate, time));
    setIsCalendarOpen(false);
  };

  const handleFrequencyChange = (e: React.MouseEvent<HTMLDivElement>) => {
    const frequency = e.currentTarget.textContent ?? '';
    setSelectedFrequency(frequency);
    setValue('frequencyType', REVERSE_FREQUENCY_MAP[frequency] || 'ONCE');
  };

  const toggleDay = (idx: number) => {
    setWeekDays((prev) => (prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]));
  };

  const updateTime = (key: 'period' | 'time', value: string) => {
    let newPeriod = selectedTime.period;
    let newTime = selectedTime.time;

    if (key === 'period') {
      newPeriod = value as '오전' | '오후';
      const list = newPeriod === '오전' ? am : pm;
      if (!list.includes(newTime)) {
        newTime = list[0];
      }
    } else {
      newTime = value;
    }

    updateStartDate(createStartDate(currentValue.startDate, newTime));
    setSelectedTime({ period: newPeriod, time: newTime });

    if (key === 'time') setIsTimeOpen(false);
  };

  const closeTaskItemModal = () => closeModal(createOrEditModalId ?? '');

  const markFrequencyForDelete = () => {
    setIsFrequencyDelete(true);
  };

  const handleCreateTaskItemSubmit = async (taskItem: TaskItem) => {
    try {
      const updatedStartDate = createStartDate(taskItem.startDate, time);

      let finalTaskItem: TaskItem = {
        ...taskItem,
        startDate: updatedStartDate,
      };

      if (finalTaskItem.frequencyType === 'WEEKLY') {
        finalTaskItem = {
          ...finalTaskItem,
          weekDays,
        };
      }

      if (finalTaskItem.frequencyType === 'MONTHLY') {
        finalTaskItem = {
          ...finalTaskItem,
          monthDay: getDate(finalTaskItem.startDate),
        };
      }
      await axiosClient.post(`/groups/${groupId}/task-lists/${taskListId}/tasks`, finalTaskItem);

      revalidateTasks();
      closeTaskItemModal();
    } catch {
      Toast.error('할 일 생성 실패');
    }
  };

  const isEqualTaskItem =
    currentValue.name === detailTask?.name && currentValue.description === detailTask?.description;

  const handleEditTaskItemSubmit = async (taskItem: TaskItem) => {
    if (isEqualTaskItem) {
      Toast.info('변경된 내용이 없습니다.');
      return;
    }

    try {
      await axiosClient.patch(
        `/groups/${groupId}/task-lists/${taskListId}/tasks/${detailTask?.id}`,
        {
          done: isDone,
          name: taskItem.name,
          description: taskItem.description,
        }
      );

      revalidateTasks();
      closeTaskItemModal();
    } catch {
      Toast.error('할 일 수정 실패');
    }
  };

  const isWeekly = selectedFrequency === '주 반복';
  const isOnce = task?.frequencyType === 'ONCE';

  const onSubmit = task
    ? handleSubmit(handleEditTaskItemSubmit)
    : handleSubmit(handleCreateTaskItemSubmit);

  return {
    form,
    taskItem: currentValue,
    selectedTime,
    weekDays,
    isWeekly,
    isOnce,
    isCalendarOpen,
    isTimeOpen,
    select,
    handleCalendarDateChange,
    handleFrequencyChange,
    markFrequencyForDelete,
    onSubmit,
    toggleDay,
    updateTime,
    closeTaskItemModal,
  };
}
