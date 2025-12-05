import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '../ui/textarea';
import { TabsContent } from '../ui/tabs';
import { Button } from '@/components/ui/button';
import { EntryPointSelect } from '../entry-point-select';
import { ParameterInput } from './parameter-input';
import { Chain } from '@/components/networks-select';
import { SimpleContractCall } from '@/lib/utils';

import { validateHexFormat, validateCalldataString } from '../../lib/utils/validation-utils';
import { XCircleIcon } from '@heroicons/react/24/outline';

interface ContractCallFieldsetProps {
	call: SimpleContractCall;
	index: number;
	chain: Chain | undefined;
	contractCallsFunctions: { [key: string]: any };
	isLoadingFunctions: { [key: string]: boolean };
	contractFetchErrors: { [key: string]: string };
	alert: boolean;
	decodeCalldata: any;
	serverDataLoaded: boolean;
	isParameterInvalid: boolean;
	hasDecodeError: boolean;
	onContractAddressChange: (index: number, newAddress: string) => void;
	onFunctionNameChange: (index: number, newFunctionName: string, address: string) => void;
	onCalldataChange: (index: number, newCalldata: string) => void;
	onParameterValueChange: (callIndex: number, paramIndex: number, newValue: any) => void;
	onValidationChange: (isValid: boolean) => void;
	onResetCalldata: (index: number) => void;
}

export function ContractCallFieldset({
	call,
	index,
	chain,
	contractCallsFunctions,
	isLoadingFunctions,
	contractFetchErrors,
	alert,
	decodeCalldata,
	serverDataLoaded,
	hasDecodeError,
	onContractAddressChange,
	onFunctionNameChange,
	onCalldataChange,
	onParameterValueChange,
	onValidationChange,
	onResetCalldata
}: ContractCallFieldsetProps) {
	const hasInvalidCalldataFormat = call.calldata !== '' && !validateCalldataString(call.calldata);
	const contractError = call.address ? contractFetchErrors[call.address] : undefined;
	const hasContractError = !!contractError && validateHexFormat(call.address);

	console.log('call', call);
	return (
		<fieldset
			key={`${index}-${call.address}-${call.function_name}`}
			className="border rounded-md p-4 mt-4"
		>
			<legend className="px-2 font-medium text-sm">Call #{index + 1}</legend>
			<div className="grid gap-4">
				<div className="grid grid-cols-1 md:grid-cols-4 md:items-center gap-x-4 gap-y-2">
					<Label htmlFor={`contract-address-${index}`} className="md:text-right ">
						Contract address
					</Label>
					<Input
						id={`contract-address-${index}`}
						value={call.address}
						onChange={(e) => onContractAddressChange(index, e.target.value)}
						className={`md:col-span-3 font-mono ${
							(alert &&
								(!call.address ||
									!validateHexFormat(call.address) ||
									!contractCallsFunctions[call.address])) ||
							hasContractError
								? 'border-red-500'
								: ''
						}`}
					/>
					{alert && !call.address && (
						<p className="text-xs text-red-500 md:col-span-3 md:col-start-2">
							Contract address is required.
						</p>
					)}
					{alert && call.address && !validateHexFormat(call.address) && (
						<p className="text-xs text-red-500 md:col-span-3 md:col-start-2">
							Contract address must be a hexadecimal number.
						</p>
					)}
					{hasContractError && (
						<p className="text-xs text-red-500 md:col-span-3 md:col-start-2">{contractError}</p>
					)}
					{alert &&
						!contractCallsFunctions[call.address] &&
						!hasContractError &&
						call.address &&
						validateHexFormat(call.address) && (
							<p className="text-xs text-red-500 md:col-span-3 md:col-start-2">
								This contract is not deployed on {chain?.chainId}.
							</p>
						)}
				</div>

				<EntryPointSelect
					chain={chain}
					entryPoints={call.address ? contractCallsFunctions[call.address] : null}
					value={call.function_name}
					isLoading={call.address ? isLoadingFunctions[call.address] : false}
					isError={alert && call.function_name === ''}
					onChange={(value) => onFunctionNameChange(index, value, call.address)}
				/>

				<TabsContent
					value="raw"
					className="grid grid-cols-1 md:grid-cols-4 md:items-center gap-y-2 gap-x-4"
				>
					<Label htmlFor={`calldata-${index}`} className="md:text-right">
						Calldata
					</Label>
					<Textarea
						disabled={call.function_name === ''}
						id={`calldata-${index}`}
						value={call.calldata}
						placeholder={`Enter raw calldata here. For example:\n\n0x0000000000000000000000000000000000000000000000000000000000000001\n0x014c52727fc025f10d431efafb3945a06601e3703fc06c934df177a6c30f3280\n0x02f67e6aeaad1ab7487a680eb9d3363a597afa7a3de33fa9bf3ae6edcb88435d`}
						className={`md:col-span-3 font-mono h-32 ${
							alert && call.address && hasInvalidCalldataFormat ? 'border-red-500' : ''
						}`}
						onChange={(e) => onCalldataChange(index, e.target.value)}
					/>

					{alert && hasInvalidCalldataFormat && (
						<p className="text-xs text-red-500 md:col-span-3 md:col-start-2">
							Calldata must be a list of hexadecimal numbers, each starting with 0x on a new line.
						</p>
					)}
				</TabsContent>
			</div>

			<TabsContent
				value="parameters"
				className="grid grid-cols-1 md:grid-cols-4 md:items-center gap-y-2 gap-x-4"
			>
				<Label
					htmlFor={`calldata-${index}-parameters`}
					className="md:text-right pb-2 border-b border-border md:border-none md:pb-0"
				>
					Calldata
				</Label>
				{decodeCalldata && decodeCalldata?.decoded_calldata[index]?.parameters?.length > 0 ? (
					<div key={`border-${index}-parameter`} className="md:col-span-3 space-y-4">
						{(() => {
							const parameters = decodeCalldata?.decoded_calldata[index]?.parameters || [];
							const functionData = contractCallsFunctions[call.address]?.find(
								(fn: any) => fn[0] === call.function_name
							);

							return parameters.map((parameter: any, idx: number) => {
								let paramFunctionInput = undefined;
								if (functionData && functionData[1]?.inputs) {
									paramFunctionInput = functionData[1].inputs.find(
										(input: any) => input.name === parameter.name
									);
								}

								return (
									<div key={`${index}-${idx}-${call.function_name}`}>
										<ParameterInput
											key={`param-${index}-${idx}-${call.function_name}`}
											parameter={parameter}
											functionInput={paramFunctionInput}
											onValidationChange={onValidationChange}
											onValueChange={(newValue) => onParameterValueChange(index, idx, newValue)}
										/>
									</div>
								);
							});
						})()}
					</div>
				) : hasDecodeError ? (
					<div className="md:col-span-3 border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 rounded-lg p-4">
						<div className="flex flex-col md:flex-row items-start justify-between gap-4">
							<div className="flex-1">
								<div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-2">
									<XCircleIcon className="w-5 h-5 flex-shrink-0" />
									<p className="font-medium">Invalid Calldata</p>
								</div>
								<p className="text-sm text-red-600/80 dark:text-red-400/80">
									The raw calldata provided could not be decoded. Please check your input or reset
									calldata to default values.
								</p>
							</div>
							<Button
								variant="outline"
								size="sm"
								onClick={() => onResetCalldata(index)}
								className="border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 w-full md:w-auto"
							>
								Reset
							</Button>
						</div>
					</div>
				) : (
					<div className="text-sm text-muted-foreground md:col-span-3">
						{contractCallsFunctions[call.address]?.length
							? 'Selected entrypoint does not accept any calldata.'
							: 'No entrypoints found'}
					</div>
				)}
			</TabsContent>
		</fieldset>
	);
}
