'use client';

import Button from '@/components/common/Button';
import Fields from '../common/formField/Fields';
import Input from '../common/formField/compound/Input';
import FileInput from '../common/formField/compound/FileInput';
import ImageUploader from '../common/formField/compound/ImageUploader';
import BouncingDots from '@/components/common/loading/BouncingDots';
import useManageGroup from './useManageGroup';
import { Group } from '@/types/group';

export type ManageGroup = Partial<Pick<Group, 'id'>> & Pick<Group, 'name' | 'image'>;

interface ManageGroupProps {
  groupData?: ManageGroup;
  groupNames: string[];
}

export default function ManageGroup({ groupData, groupNames }: ManageGroupProps) {
  const isEdit = !!groupData;
  const groupButtonText = isEdit ? '수정하기' : '생성하기';

  const {
    form: {
      register,
      handleSubmit,
      formState: { errors },
    },
    image,
    isPending,
    handleImageChange,
    handleSubmitGroup,
  } = useManageGroup({ isEdit, groupData, groupNames });

  return (
    <form onSubmit={handleSubmit(handleSubmitGroup)} className="flex w-full flex-col gap-10">
      <div className="flex w-full flex-col gap-6">
        <Fields
          label="팀 프로필"
          errorMessage={errors.image?.message}
          render={() => (
            <FileInput name="image" onImageChange={handleImageChange}>
              {({ inputRef }) => (
                <ImageUploader image={image} imageUploaderType="team" inputRef={inputRef} />
              )}
            </FileInput>
          )}
        />

        <Fields
          label="팀 이름"
          errorMessage={errors.name?.message}
          render={() => {
            const { onBlur, ...inputProps } = register('name');
            return (
              <Input
                {...inputProps}
                placeholder="팀 이름을 입력해 주세요."
                onBlur={onBlur}
                hasError={!!errors.name}
              />
            );
          }}
        />
      </div>

      <div className="flex flex-col gap-6">
        <Button type="submit" variant="solid" size="fullWidth" disabled={isPending}>
          {isPending ? <BouncingDots /> : groupButtonText}
        </Button>
        <p className="text-lg-rg text-gray500 text-center">
          팀 이름은 회사명이나 모임 이름 등으로 설정하면 좋아요.
        </p>
      </div>
    </form>
  );
}
